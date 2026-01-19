#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { XMLParser, XMLBuilder } = require('fast-xml-parser');

function usage() {
  console.error('Usage: join-backups <out.xml> <in1.xml> [in2.xml ...]');
}

async function run() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    usage();
    process.exit(2);
  }

  const outPath = args[0];
  const inPaths = args.slice(1);

  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
  const builder = new XMLBuilder({ ignoreAttributes: false, attributeNamePrefix: '@_', format: true });

  let mergedSms = [];
  let topAttrs = {};
  let topName = null; // e.g., 'smses'

  for (const p of inPaths) {
    const content = fs.readFileSync(p, 'utf8');
    const parsed = parser.parse(content);

    // Common backup formats: { smses: { '@_count': '...', sms: [ ... ] } }
    // Or some may use <smses><sms .../></smses> mapping.
    const rootKeys = Object.keys(parsed);
    if (rootKeys.length === 0) continue;
    const root = parsed[rootKeys[0]];
    const rootName = rootKeys[0];

    if (!topName) {
      topName = rootName;
      // copy attributes if present
      if (root && typeof root === 'object') {
        Object.keys(root).forEach(k => {
          if (k.startsWith('@_')) topAttrs[k] = root[k];
        });
      }
    }

    const smsNodes = root && root.sms ? root.sms : [];

    if (Array.isArray(smsNodes)) {
      mergedSms = mergedSms.concat(smsNodes);
    } else if (smsNodes && typeof smsNodes === 'object') {
      mergedSms.push(smsNodes);
    } else {
      // Nothing under this root - skip
    }
  }

  // Rebuild root object
  // Keep topAttrs (like count), but set count to actual merged length
  const mergedRoot = {};
  // attach attributes with prefix used by parser
  Object.keys(topAttrs).forEach(k => mergedRoot[k] = topAttrs[k]);
  mergedRoot['sms'] = mergedSms;
  mergedRoot['@_count'] = String(mergedSms.length);

  const outObj = {};
  outObj[topName || 'smses'] = mergedRoot;

  const xml = builder.build(outObj);

  fs.writeFileSync(outPath, xml, 'utf8');
  console.log(`Wrote ${outPath} (${mergedSms.length} messages)`);
}

run().catch(err => {
  console.error('Error:', err && err.message ? err.message : String(err));
  process.exit(1);
});
