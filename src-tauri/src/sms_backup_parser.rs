use serde::Serialize;
use std::{
  collections::BTreeMap,
  fs::File,
  io::{BufReader, Read},
  path::Path,
};

use quick_xml::{
  events::{BytesStart, Event},
  Reader,
};

#[derive(Debug, Clone, Serialize)]
pub struct ParsedMessage {
  pub contactAddress: String,
  pub contactName: Option<String>,
  pub r#type: i32,
  pub timestamp: String,
  pub dateMs: i64,
  pub body: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ParseBatch {
  pub messages: Vec<ParsedMessage>,
  pub bytesRead: u64,
  pub totalBytes: u64,
  pub parsedCount: u64,
}

#[derive(Debug, Clone, Serialize)]
pub struct ParseProgress {
  pub bytesRead: u64,
  pub totalBytes: u64,
  pub parsedCount: u64,
}

#[derive(Debug, Clone, Serialize)]
pub struct ParseDone {
  pub bytesRead: u64,
  pub totalBytes: u64,
  pub parsedCount: u64,
}

fn attr_value<R: Read>(reader: &Reader<R>, start: &BytesStart, key: &[u8]) -> Option<String> {
  for attr in start.attributes().with_checks(false).flatten() {
    if attr.key.as_ref() == key {
      if let Ok(v) = attr.decode_and_unescape_value(reader) {
        return Some(v.into_owned());
      }
    }
  }
  None
}

fn parse_i32(s: Option<String>, default: i32) -> i32 {
  s.and_then(|v| v.parse::<i32>().ok()).unwrap_or(default)
}

fn parse_i64(s: Option<String>, default: i64) -> i64 {
  s.and_then(|v| v.parse::<i64>().ok()).unwrap_or(default)
}

fn mms_body(text_parts: &[String], media_counts: &BTreeMap<String, u32>) -> String {
  let mut out = String::new();

  for t in text_parts {
    if !t.is_empty() {
      out.push_str("<div>");
      out.push_str(t);
      out.push_str("</div>");
    }
  }

  let total_media: u32 = media_counts.values().copied().sum();
  if total_media > 0 {
    out.push_str("<div>");
    out.push_str(&format!(
      "[{} attachment{} omitted]",
      total_media,
      if total_media == 1 { "" } else { "s" }
    ));

    if !media_counts.is_empty() {
      out.push_str(" ");
      let mut first = true;
      for (ct, count) in media_counts {
        if !first {
          out.push_str(", ");
        }
        first = false;
        out.push_str(&format!("{}×{}", count, ct));
      }
    }

    out.push_str("</div>");
  }

  out
}

struct MmsAcc {
  contact_address: String,
  r#type: i32,
  text_parts: Vec<String>,
  media_counts: BTreeMap<String, u32>,
}

fn parse_mms_inner<R: Read>(
  reader: &mut Reader<R>,
  total_bytes: u64,
  parsed_count: u64,
) -> Result<(MmsAcc, u64, u64), String> {
  let mut buf = Vec::new();
  let mut acc = MmsAcc {
    contact_address: String::new(),
    r#type: 3,
    text_parts: Vec::new(),
    media_counts: BTreeMap::new(),
  };

  loop {
    match reader.read_event_into(&mut buf) {
      Ok(Event::Start(e)) => {
        match e.local_name().as_ref() {
          b"addr" => {
            if let Some(addr_type) = attr_value(reader, &e, b"type") {
              if let Some(address) = attr_value(reader, &e, b"address") {
                if addr_type == "137" || acc.contact_address == "insert-address-token" {
                  acc.contact_address = address;
                }
                if acc.contact_address == "insert-address-token" {
                  acc.r#type = 4;
                }
              }
            }
          }
          _ => {}
        }
      }
      Ok(Event::Empty(e)) => {
        match e.local_name().as_ref() {
          b"addr" => {
            if let Some(addr_type) = attr_value(reader, &e, b"type") {
              if let Some(address) = attr_value(reader, &e, b"address") {
                if addr_type == "137" || acc.contact_address == "insert-address-token" {
                  acc.contact_address = address;
                }
                if acc.contact_address == "insert-address-token" {
                  acc.r#type = 4;
                }
              }
            }
          }
          b"part" => {
            let ct = attr_value(reader, &e, b"ct").unwrap_or_default();
            if ct == "text/plain" {
              if let Some(text) = attr_value(reader, &e, b"text") {
                acc.text_parts.push(text);
              }
            } else if !ct.is_empty() {
              *acc.media_counts.entry(ct).or_insert(0) += 1;
            }
          }
          _ => {}
        }
      }
      Ok(Event::End(e)) => {
        if e.local_name().as_ref() == b"mms" {
          let bytes_read = reader.buffer_position() as u64;
          return Ok((acc, bytes_read, parsed_count));
        }
      }
      Ok(Event::Eof) => {
        return Err("Unexpected EOF while parsing <mms>".to_string());
      }
      Err(e) => {
        return Err(format!("XML read error: {e}"));
      }
      _ => {}
    }

    buf.clear();

    // Keep the reader progressing; progress reporting happens in the outer loop.
    let _ = total_bytes;
  }
}

pub fn parse_sms_backup_streaming<FEmitBatch, FEmitProgress>(
  path: &Path,
  mut emit_batch: FEmitBatch,
  mut emit_progress: FEmitProgress,
) -> Result<ParseDone, String>
where
  FEmitBatch: FnMut(ParseBatch) -> Result<(), String>,
  FEmitProgress: FnMut(ParseProgress) -> Result<(), String>,
{
  let file = File::open(path).map_err(|e| format!("Failed to open file: {e}"))?;
  let total_bytes = file
    .metadata()
    .map(|m| m.len())
    .unwrap_or(0);

  let mut reader = Reader::from_reader(BufReader::new(file));
  reader.trim_text(true);

  const BATCH_SIZE: usize = 500;
  const PROGRESS_EVERY: u64 = 2_000;

  let mut parsed_count: u64 = 0;
  let mut batch: Vec<ParsedMessage> = Vec::with_capacity(BATCH_SIZE);

  let mut buf = Vec::new();
  loop {
    match reader.read_event_into(&mut buf) {
      Ok(Event::Empty(e)) => {
        match e.local_name().as_ref() {
          b"sms" => {
            let contact_address = attr_value(&reader, &e, b"address").unwrap_or_default();
            let contact_name = attr_value(&reader, &e, b"contact_name");
            let msg_type = parse_i32(attr_value(&reader, &e, b"type"), 0);
            let timestamp = attr_value(&reader, &e, b"date").unwrap_or_default();
            let date_ms = parse_i64(Some(timestamp.clone()), 0);
            let body = attr_value(&reader, &e, b"body").unwrap_or_default();

            batch.push(ParsedMessage {
              contactAddress: contact_address,
              contactName: contact_name,
              r#type: msg_type,
              timestamp,
              dateMs: date_ms,
              body,
            });
            parsed_count += 1;
          }
          _ => {}
        }
      }
      Ok(Event::Start(e)) => {
        match e.local_name().as_ref() {
          b"sms" => {
            // Some exporters may use <sms> ... </sms>. Treat as start tag.
            let contact_address = attr_value(&reader, &e, b"address").unwrap_or_default();
            let contact_name = attr_value(&reader, &e, b"contact_name");
            let msg_type = parse_i32(attr_value(&reader, &e, b"type"), 0);
            let timestamp = attr_value(&reader, &e, b"date").unwrap_or_default();
            let date_ms = parse_i64(Some(timestamp.clone()), 0);
            let body = attr_value(&reader, &e, b"body").unwrap_or_default();

            batch.push(ParsedMessage {
              contactAddress: contact_address,
              contactName: contact_name,
              r#type: msg_type,
              timestamp,
              dateMs: date_ms,
              body,
            });
            parsed_count += 1;
          }
          b"mms" => {
            let contact_name = attr_value(&reader, &e, b"contact_name");
            let timestamp = attr_value(&reader, &e, b"date").unwrap_or_default();
            let date_ms = parse_i64(Some(timestamp.clone()), 0);

            let (acc, _bytes_read, parsed_so_far) =
              parse_mms_inner(&mut reader, total_bytes, parsed_count)?;

            let body = mms_body(&acc.text_parts, &acc.media_counts);

            batch.push(ParsedMessage {
              contactAddress: acc.contact_address,
              contactName: contact_name,
              r#type: acc.r#type,
              timestamp,
              dateMs: date_ms,
              body,
            });
            parsed_count = parsed_so_far + 1;
          }
          _ => {}
        }
      }
      Ok(Event::Eof) => break,
      Err(e) => return Err(format!("XML read error: {e}")),
      _ => {}
    }

    buf.clear();

    let bytes_read = reader.buffer_position() as u64;

    if !batch.is_empty() && batch.len() >= BATCH_SIZE {
      emit_batch(ParseBatch {
        messages: std::mem::take(&mut batch),
        bytesRead: bytes_read,
        totalBytes: total_bytes,
        parsedCount: parsed_count,
      })?;
    }

    if parsed_count > 0 && parsed_count % PROGRESS_EVERY == 0 {
      emit_progress(ParseProgress {
        bytesRead: bytes_read,
        totalBytes: total_bytes,
        parsedCount: parsed_count,
      })?;
    }
  }

  let bytes_read = reader.buffer_position() as u64;

  if !batch.is_empty() {
    emit_batch(ParseBatch {
      messages: std::mem::take(&mut batch),
      bytesRead: bytes_read,
      totalBytes: total_bytes,
      parsedCount: parsed_count,
    })?;
  }

  emit_progress(ParseProgress {
    bytesRead: bytes_read,
    totalBytes: total_bytes,
    parsedCount: parsed_count,
  })?;

  Ok(ParseDone {
    bytesRead: bytes_read,
    totalBytes: total_bytes,
    parsedCount: parsed_count,
  })
}
