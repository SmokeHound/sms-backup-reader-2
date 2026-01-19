(function () {
  const filesEl = document.getElementById('files');
  const fileListEl = document.getElementById('fileList');
  const mergeBtn = document.getElementById('mergeBtn');
  const statusEl = document.getElementById('status');
  const outName = document.getElementById('outname');
  const downloadLink = document.getElementById('downloadLink');

  let selectedFiles = [];

  filesEl.addEventListener('change', (e) => {
    selectedFiles = Array.from(filesEl.files || []);
    renderFileList();
  });

  // Drag & drop support
  const dropZone = document.getElementById('dropZone');
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.borderColor = '#2563eb'; });
  dropZone.addEventListener('dragleave', (e) => { e.preventDefault(); dropZone.style.borderColor = '#ccc'; });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = '#ccc';
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length) {
      selectedFiles = Array.from(dt.files).filter(f => f.name && f.name.toLowerCase().endsWith('.xml'));
      filesEl.files = dt.files; // optional
      renderFileList();
    }
  });

  function renderFileList() {
    if (!selectedFiles.length) {
      fileListEl.textContent = 'No files selected';
    } else {
      fileListEl.innerHTML = selectedFiles.map((f, idx) => `${idx+1}. ${escapeHtml(f.name)} (${f.size} bytes)`).join('<br>');
    }
    downloadLink.style.display = 'none';
    statusEl.textContent = '';
    document.getElementById('preview').style.display = 'none';
  }

  mergeBtn.addEventListener('click', async () => {
    if (!selectedFiles.length) {
      statusEl.textContent = 'Please choose at least one XML backup to merge.';
      return;
    }
    statusEl.textContent = 'Reading files...';
    downloadLink.style.display = 'none';

    try {
      const reads = selectedFiles.map(f => readFileAsText(f));
      const contents = await Promise.all(reads);

      const parser = new window['fastXmlParser'].XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
      const builder = new window['fastXmlParser'].XMLBuilder({ ignoreAttributes: false, attributeNamePrefix: '@_', format: true });

      let merged = [];
      let topName = null;
      let topAttrs = {};

      // For preview, collect some metadata
      let totalMsgs = 0;
      const contactSet = new Set();

      for (const c of contents) {
        // quick validation: try parsing
        let parsed;
        try {
          parsed = parser.parse(c);
        } catch (err) {
          statusEl.textContent = 'One of the files is not valid XML or not a supported SMS backup.';
          console.error('Invalid XML parse', err);
          return;
        }

        const keys = Object.keys(parsed);
        if (!keys.length) continue;
        const rootName = keys[0];
        const root = parsed[rootName];

        if (!topName) {
          topName = rootName;
          // collect '@_' attributes from root
          for (const k of Object.keys(root || {})) {
            if (k.startsWith('@_')) topAttrs[k] = root[k];
          }
        }

        const smsNodes = root && root.sms ? root.sms : [];
        const nodes = Array.isArray(smsNodes) ? smsNodes : (smsNodes && typeof smsNodes === 'object' ? [smsNodes] : []);
        merged = merged.concat(nodes);

        // collect preview info
        totalMsgs += nodes.length;
        for (const m of nodes) {
          const addr = m['@_address'] || m.address || m.contact || '';
          if (addr) contactSet.add(addr);
        }
      }

      // build root preserving attributes and setting count
      const outRoot = Object.assign({}, topAttrs);
      outRoot['sms'] = merged;
      outRoot['@_count'] = String(merged.length);

      const outObj = {};
      outObj[topName || 'smses'] = outRoot;

      const xml = builder.build(outObj);

      // Update preview
      const previewEl = document.getElementById('preview');
      const previewContent = document.getElementById('previewContent');
      previewContent.innerHTML = `Selected files: ${selectedFiles.length}<br/>Estimated messages merged: ${merged.length}<br/>Unique contacts: ${contactSet.size}`;
      previewEl.style.display = 'block';

      // Prepare download link
      const blob = new Blob([xml], { type: 'application/xml' });
      const name = (outName.value && outName.value.trim()) ? outName.value.trim() : 'merged.xml';

      const url = URL.createObjectURL(blob);
      downloadLink.href = url;
      downloadLink.download = name;
      downloadLink.textContent = 'Download ' + name;
      downloadLink.style.display = 'inline-block';

      statusEl.textContent = `Ready. Merged ${merged.length} messages.`;

    } catch (err) {
      console.error(err);
      statusEl.textContent = 'Error merging files: ' + String(err.message || err);
    }
  });

  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onerror = () => reject(r.error);
      r.onload = () => resolve(String(r.result || ''));
      r.readAsText(file, 'utf-8');
    });
  }

  function escapeHtml(s) {
    return s.replace(/[&<>\"]+/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c] || c));
  }
})();