const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

const BASE = 'G:/My Drive/WWF/IKEA/FSC/FSC Package/Sep2020/';

const FILES = [
  { key: 'process', file: 'So do FSC.docx', title: 'Sơ đồ tiến trình FSC' },
  { key: 'm1', file: 'M1 FSC Group Certification Practical Guideline_V7.0_29092020.docx', title: 'M1 - Giới thiệu và tổng quan' },
  { key: 'm2', file: 'M2 FSC Group Certification Practical Guideline_V7.0_29092020.docx', title: 'M2 - Sự cần thiết và đối tượng áp dụng' },
  { key: 'm3', file: 'M3 FSC Group Certification Practical Guideline_V7.0_29092020.docx', title: 'M3 - Hướng dẫn thực hiện' },
  { key: 'm4', file: 'M4 FSC Group Certification Practical Guideline_V7.0_29092020.docx', title: 'M4 - Xây dựng hồ sơ tài liệu' },
  { key: 'm5', file: 'M5 FSC Group Certification Practical Guideline_29092020.docx', title: 'M5 - Kỹ thuật lâm sinh' },
  { key: 'm6', file: 'M6 FSC Group Certification Practical Guideline_V7.0_29092020.docx', title: 'M6 - Các điểm không tuân thủ' },
];

// Document titles mapped for cleaning - these lines appear at start of each doc
const METADATA_STRINGS = [
  'Dự án Mây tre keo bền vững (SBARP)',
  'Dự án Mây tre keo bền vững',
  'SBARP',
  'Tài liệu hướng dẫn thực hiện chứng chỉ rừng FSC',
  'Mô hình chứng chỉ Nhóm hộ',
  'Biên tập:',
  'Lê Thiện Đức',
  'Lộc Vũ Trung',
  'Nguyễn Vũ',
  'Lê Viết Tám',
  'Hà Nội,',
  '29.09.2020',
  'A body of water surrounded by trees',
  'Description automatically generated',
];

function cleanHTML(html, key) {
  let cleaned = html;

  // Step 1: Remove the cover page elements (first few paragraphs with metadata)
  // The pattern is: project name, subtitle, module title, editors, date, cover image
  // Remove paragraphs containing metadata strings
  METADATA_STRINGS.forEach(str => {
    // Remove <p> tags containing the string (with possible surrounding tags)
    const escaped = str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    cleaned = cleaned.replace(new RegExp(`<p>[^<]*${escaped}[^<]*</p>`, 'gi'), '');
    // Also handle wrapped in <strong>
    cleaned = cleaned.replace(new RegExp(`<p><strong>[^<]*${escaped}[^<]*</strong></p>`, 'gi'), '');
  });

  // Remove the cover image (first large image that is the landscape photo)
  // Match img tags with base64 data that are very large (cover photos)
  const firstImgMatch = cleaned.match(/<p><img[^>]*src="data:image[^"]{10000,}"[^>]*><\/p>/);
  if (firstImgMatch) {
    cleaned = cleaned.replace(firstImgMatch[0], '');
  }

  // Step 2: Remove TOC entries (they reference page numbers that don't apply to web)
  // TOC entries look like text followed by page numbers in tabs
  // mammoth converts TOC as regular paragraphs - they will have hyperlinks to bookmarks
  // Keep them as they serve as navigation

  // Step 3: Remove specific metadata patterns
  cleaned = cleaned.replace(/FSC Group Certification Practical Guideline/gi, '');
  cleaned = cleaned.replace(/Version\s*[\d.]+/gi, '');
  cleaned = cleaned.replace(/V7\.0/g, '');
  cleaned = cleaned.replace(/29\/09\/2020/g, '');
  cleaned = cleaned.replace(/29092020/g, '');
  cleaned = cleaned.replace(/Sep(tember)?\s*2020/gi, '');
  cleaned = cleaned.replace(/WWF[- ]?Vietnam/gi, '');
  cleaned = cleaned.replace(/WWF[- ]?Việt Nam/gi, '');
  cleaned = cleaned.replace(/IKEA[^<]{0,50}project/gi, '');
  cleaned = cleaned.replace(/Prepared by[^<]*/gi, '');
  cleaned = cleaned.replace(/Reviewed by[^<]*/gi, '');
  cleaned = cleaned.replace(/Approved by[^<]*/gi, '');

  // Step 4: Clean up empty/whitespace-only tags
  for (let i = 0; i < 3; i++) {  // Multiple passes
    cleaned = cleaned.replace(/<p>\s*<\/p>/g, '');
    cleaned = cleaned.replace(/<p>\s*<strong>\s*<\/strong>\s*<\/p>/g, '');
    cleaned = cleaned.replace(/<p>\s*<em>\s*<\/em>\s*<\/p>/g, '');
    cleaned = cleaned.replace(/<h[1-6]>\s*<\/h[1-6]>/g, '');
    cleaned = cleaned.replace(/<strong>\s*<\/strong>/g, '');
    cleaned = cleaned.replace(/<em>\s*<\/em>/g, '');
  }

  // Step 5: Remove excessive breaks
  cleaned = cleaned.replace(/(<br\s*\/?>\s*){3,}/g, '<br><br>');

  // Step 6: Clean leading whitespace
  cleaned = cleaned.trim();

  return cleaned;
}

async function convert() {
  console.log('Converting DOCX to HTML...\n');

  // Output directory for HTML fragments
  const outputDir = path.join(__dirname, '..', 'handbook');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

  const manifest = {};

  for (const item of FILES) {
    const fullPath = BASE + item.file;
    console.log(`Processing: ${item.key} (${item.file})`);

    try {
      const r = await mammoth.convertToHtml(
        { path: fullPath },
        { convertImage: mammoth.images.dataUri }
      );

      if (r.messages.length > 0) {
        const warnings = r.messages.filter(m => m.type === 'warning');
        if (warnings.length) console.log(`  ${warnings.length} warnings`);
      }

      let html = cleanHTML(r.value, item.key);

      // Extract real title from Modun line if present
      let title = item.title;
      const modunMatch = html.match(/Modun\s*\d+\s*:\s*([^<]+)/i);
      if (modunMatch) {
        title = item.key.toUpperCase() + ' - ' + modunMatch[1].trim();
        // Remove the modun line from content (it will be the tab/header title)
        html = html.replace(/<p>[^<]*Modun\s*\d+\s*:[^<]*<\/p>/i, '');
      }

      // Write HTML fragment file
      const fragPath = path.join(outputDir, `${item.key}.html`);
      fs.writeFileSync(fragPath, html, 'utf8');

      const sizeKB = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1);
      manifest[item.key] = { title, sizeKB: parseFloat(sizeKB) };
      console.log(`  OK: ${sizeKB} KB, title: "${title}"\n`);

    } catch (e) {
      console.error(`  ERROR: ${e.message}\n`);
      const errHtml = `<p class="text-danger">Lỗi đọc tài liệu: ${e.message}</p>`;
      fs.writeFileSync(path.join(outputDir, `${item.key}.html`), errHtml, 'utf8');
      manifest[item.key] = { title: item.title, sizeKB: 0 };
    }
  }

  // Write manifest JSON for the viewer to use
  fs.writeFileSync(
    path.join(outputDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf8'
  );

  console.log('\nManifest:');
  console.log(JSON.stringify(manifest, null, 2));

  // Total size
  let total = 0;
  for (const v of Object.values(manifest)) total += v.sizeKB;
  console.log(`\nTotal: ${total.toFixed(1)} KB in ${Object.keys(manifest).length} files`);
  console.log(`Output: ${outputDir}/`);
}

convert().catch(err => console.error('Fatal:', err));
