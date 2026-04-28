import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { format } from 'date-fns';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#333',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: '#10b981', // emerald-600
    paddingBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#059669',
  },
  meta: {
    fontSize: 10,
    color: '#666',
    textAlign: 'right',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 10,
    backgroundColor: '#f0fdf4',
    padding: 5,
    color: '#065f46',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    overflow: 'hidden',
  },
  summaryItem: {
    width: '50%',
    padding: 10,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: '#e5e7eb',
  },
  label: {
    fontSize: 8,
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  value: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  table: {
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomColor: '#e5e7eb',
    borderBottomWidth: 1,
    minHeight: 25,
    alignItems: 'center',
  },
  tableColHeader: {
    backgroundColor: '#f9fafb',
    fontWeight: 'bold',
  },
  tableCol: {
    width: '25%',
    borderStyle: 'solid',
    borderRightWidth: 1,
    borderColor: '#e5e7eb',
    padding: 5,
  },
  amountCol: {
    width: '20%',
    textAlign: 'right',
  },
  descCol: {
    width: '40%',
  },
  dateCol: {
    width: '20%',
  },
  typeCol: {
    width: '20%',
  },
  footer: {
    marginTop: 40,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureLine: {
    width: 150,
    borderTopWidth: 1,
    borderTopColor: '#333',
    marginTop: 30,
    textAlign: 'center',
    fontSize: 8,
  }
});

interface SalarySettlementDocumentProps {
  staffName: string;
  idNumber?: string;
  nationality?: string;
  settlement: {
    month: number;
    year: number;
    baseSalary: number;
    advancesTally: number;
    netPaid: number;
    method: string;
    paidAt: string | Date;
    transactions: any[];
  };
}

export function SalarySettlementDocument({ staffName, idNumber, nationality, settlement }: SalarySettlementDocumentProps) {
  const monthName = format(new Date(settlement.year, settlement.month - 1), 'MMMM');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Salary Payment Voucher</Text>
            <View style={{ marginTop: 8, gap: 2 }}>
              <Text style={{ fontSize: 12, fontWeight: 'bold' }}>Employee: {staffName}</Text>
              <Text style={{ fontSize: 9, color: '#4b5563' }}>ID / Iqama: {idNumber || 'N/A'}</Text>
              <Text style={{ fontSize: 9, color: '#4b5563' }}>Nationality: {nationality || 'N/A'}</Text>
            </View>
          </View>
          <View style={styles.meta}>
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#059669', marginBottom: 4 }}>
              {monthName} {settlement.year}
            </Text>
            <Text>Voucher #: SAL-{settlement.year}-{settlement.month}-{settlement.paidAt.toString().slice(0,4)}</Text>
            <Text>Date: {format(new Date(settlement.paidAt), 'PPP')}</Text>
          </View>
        </View>

        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 9, fontStyle: 'italic', color: '#4b5563' }}>
            I, the undersigned, hereby acknowledge the receipt of the net salary amount stated below for the specified period, after all applicable deductions.
          </Text>
        </View>

        {/* Summary Statistics */}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.label}>Base Salary</Text>
            <Text style={styles.value}>{settlement.baseSalary.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.label}>Advances/Deductions</Text>
            <Text style={[styles.value, { color: '#dc2626' }]}>- {settlement.advancesTally.toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryItem, { backgroundColor: '#f0fdf4', borderRightWidth: 0 }]}>
            <Text style={styles.label}>Net Amount Paid</Text>
            <Text style={[styles.value, { color: '#059669' }]}>{settlement.netPaid.toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryItem, { borderBottomWidth: 0, borderRightWidth: 0 }]}>
            <Text style={styles.label}>Payment Method</Text>
            <Text style={styles.value}>{settlement.method}</Text>
          </View>
        </View>

        {/* Detail Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Deduction Details (Advances & Expenses)</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableColHeader]}>
              <View style={[styles.tableCol, styles.dateCol]}><Text>Date</Text></View>
              <View style={[styles.tableCol, styles.typeCol]}><Text>Type</Text></View>
              <View style={[styles.tableCol, styles.descCol]}><Text>Description</Text></View>
              <View style={[styles.tableCol, styles.amountCol]}><Text>Amount</Text></View>
            </View>
            {settlement.transactions.map((tx, i) => (
              <View key={i} style={styles.tableRow}>
                <View style={[styles.tableCol, styles.dateCol]}><Text>{format(new Date(tx.createdAt), 'dd/MM/yyyy')}</Text></View>
                <View style={[styles.tableCol, styles.typeCol]}><Text>{tx.type}</Text></View>
                <View style={[styles.tableCol, styles.descCol]}><Text>{tx.description || '-'}</Text></View>
                <View style={[styles.tableCol, styles.amountCol]}><Text>{tx.amount.toFixed(2)}</Text></View>
              </View>
            ))}
            {settlement.transactions.length === 0 && (
              <View style={styles.tableRow}>
                <View style={[styles.tableCol, { width: '100%', textAlign: 'center' }]}><Text>No advances deducted</Text></View>
              </View>
            )}
          </View>
        </View>

        {/* Footer / Signatures */}
        <View style={styles.footer}>
          <View>
            <Text style={styles.signatureLine}>Employer Signature</Text>
          </View>
          <View>
            <Text style={styles.signatureLine}>Employee Signature</Text>
          </View>
        </View>

        <Text style={{ position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', fontSize: 8, color: '#999' }}>
          This is an official payment voucher generated by Lamaha Management System.
        </Text>
      </Page>
    </Document>
  );
}
