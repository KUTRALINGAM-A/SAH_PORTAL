import * as XLSX from 'xlsx';

/**
 * Parse an Excel file (.xlsx/.xls) containing problem statements.
 * Expected columns: PS Code | Title | Category | Organization | Domain | Description (optional)
 * 
 * @param {File} file - The uploaded Excel file
 * @returns {Promise<Array>} Parsed problem statements
 */
export async function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Read the first sheet
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Convert to JSON with header row
        const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        
        if (jsonData.length === 0) {
          reject(new Error('Excel file is empty or has no data rows.'));
          return;
        }
        
        // Map columns flexibly (case-insensitive, handle common variations)
        const problemStatements = jsonData.map((row, index) => {
          const mapped = {};
          
          for (const [key, value] of Object.entries(row)) {
            const k = key.toLowerCase().trim();
            
            if (k.includes('ps') && k.includes('code') || k === 'ps_code' || k === 'pscode') {
              mapped.ps_code = String(value).trim();
            } else if (k === 'title' || k === 'problem' || k.includes('statement')) {
              mapped.title = String(value).trim();
            } else if (k === 'category' || k === 'type') {
              const cat = String(value).trim();
              mapped.category = cat.toLowerCase().startsWith('h') ? 'Hardware' : 'Software';
            } else if (k === 'organization' || k === 'org' || k === 'ministry' || k === 'department') {
              mapped.organization = String(value).trim();
            } else if (k === 'domain' || k === 'theme' || k === 'sector') {
              mapped.domain = String(value).trim();
            } else if (k === 'description' || k === 'desc' || k === 'details') {
              mapped.description = String(value).trim();
            }
          }
          
          // Validate required fields
          if (!mapped.ps_code) mapped.ps_code = `SAH2026_PS${String(index + 1).padStart(2, '0')}`;
          if (!mapped.title) {
            throw new Error(`Row ${index + 2}: Missing "Title" column.`);
          }
          if (!mapped.category) mapped.category = 'Software';
          if (!mapped.organization) mapped.organization = 'Not specified';
          if (!mapped.domain) mapped.domain = 'General';
          
          return mapped;
        });
        
        resolve(problemStatements);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read Excel file.'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Generate Excel template for problem statement upload
 */
export function downloadTemplate() {
  const templateData = [
    {
      'PS Code': 'SAH2026_PS01',
      'Title': 'AI-based Traffic Management System',
      'Category': 'Software',
      'Organization': 'Ministry of Transport',
      'Domain': 'Smart Vehicles',
      'Description': 'Develop an AI solution to optimize traffic flow in smart cities.'
    },
    {
      'PS Code': 'SAH2026_PS02',
      'Title': 'IoT-based Water Quality Monitoring',
      'Category': 'Hardware',
      'Organization': 'Ministry of Jal Shakti',
      'Domain': 'Clean & Green Technology',
      'Description': 'Build a real-time water quality monitoring device using IoT sensors.'
    }
  ];
  
  const ws = XLSX.utils.json_to_sheet(templateData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Problem Statements');
  
  // Set column widths
  ws['!cols'] = [
    { wch: 16 }, { wch: 45 }, { wch: 12 }, { wch: 30 }, { wch: 25 }, { wch: 60 }
  ];
  
  XLSX.writeFile(wb, 'SAH2026_Problem_Statements_Template.xlsx');
}
