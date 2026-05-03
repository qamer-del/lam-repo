const fs = require('fs');

const enAdditions = `
  staffSalaryReport: 'Staff Salary Report',
  employee: 'Employee',
  advances: 'Advances',
  deductions: 'Deductions',
  netSalary: 'Net Salary',
  totalBaseSalaries: 'Total Base Salaries',
  totalAdvances: 'Total Advances',
  totalDeductions: 'Total Deductions',
  totalNetSalaries: 'Total Net Salaries',`;

const arAdditions = `
  staffSalaryReport: 'تقرير رواتب الموظفين',
  employee: 'الموظف',
  advances: 'السلف',
  deductions: 'الخصومات',
  netSalary: 'صافي الراتب',
  totalBaseSalaries: 'إجمالي الرواتب الأساسية',
  totalAdvances: 'إجمالي السلف',
  totalDeductions: 'إجمالي الخصومات',
  totalNetSalaries: 'إجمالي صافي الرواتب',`;

let c = fs.readFileSync('d:/project-lamv2/src/lib/translations.ts', 'utf8');

c = c.replace(/(\s*mixed:\s*'Mixed',?\s*)\}/, '$1\n' + enAdditions + '\n}');
c = c.replace(/(\s*mixed:\s*'متعدد',?\s*)\}/, '$1\n' + arAdditions + '\n}');

fs.writeFileSync('d:/project-lamv2/src/lib/translations.ts', c);
console.log('Added translations');
