import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { en, ar } from '@/lib/translations';

Font.register({
  family: 'Cairo',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/cairo/v31/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGMQ1z0hOA-W1Q.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/cairo/v31/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGMQ1z0hAc5W1Q.ttf', fontWeight: 700 }
  ]
});

interface SalarySettlementDocumentProps {
  staffName: string;
  idNumber?: string;
  nationality?: string;
  settlement: {
    month: number;
    year: number;
    baseSalary: number;
    overtimeAllowance?: number;
    transportAllowance?: number;
    otherAllowance?: number;
    advancesTally: number;
    netPaid: number;
    method: string;
    paidAt: string | Date;
    transactions: any[];
  };
  locale?: 'en' | 'ar' | string;
}

export function SalarySettlementDocument({ staffName, idNumber, nationality, settlement, locale = 'en' }: SalarySettlementDocumentProps) {
  if (!settlement) return null;
  const monthName = format(new Date(settlement.year, (settlement.month || 1) - 1), 'MMMM');
  const t = (k: keyof typeof en) => locale === 'ar' ? (ar as any)[k] || en[k] || k : en[k] || k;
  const isRtl = locale === 'ar';

  const styles = StyleSheet.create({
    page: {
      padding: 40,
      fontSize: 10,
      fontFamily: 'Cairo',
      color: '#333',
    },
    header: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
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
      textAlign: isRtl ? 'right' : 'left',
    },
    meta: {
      fontSize: 10,
      color: '#666',
      textAlign: isRtl ? 'left' : 'right',
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
      textAlign: isRtl ? 'right' : 'left',
    },
    summaryGrid: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
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
      borderRightWidth: isRtl ? 0 : 1,
      borderLeftWidth: isRtl ? 1 : 0,
      borderColor: '#e5e7eb',
      alignItems: isRtl ? 'flex-end' : 'flex-start',
    },
    label: {
      fontSize: 8,
      color: '#6b7280',
      textTransform: 'uppercase',
      marginBottom: 4,
      textAlign: isRtl ? 'right' : 'left',
    },
    value: {
      fontSize: 14,
      fontWeight: 'bold',
      textAlign: isRtl ? 'right' : 'left',
    },
    table: {
      width: 'auto',
      borderStyle: 'solid',
      borderWidth: 1,
      borderColor: '#e5e7eb',
      borderRightWidth: isRtl ? 1 : 0,
      borderLeftWidth: isRtl ? 0 : 1,
      borderBottomWidth: 0,
    },
    tableRow: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
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
      borderRightWidth: isRtl ? 0 : 1,
      borderLeftWidth: isRtl ? 1 : 0,
      borderColor: '#e5e7eb',
      padding: 5,
    },
    amountCol: {
      width: '20%',
      textAlign: isRtl ? 'left' : 'right',
    },
    descCol: {
      width: '40%',
      textAlign: isRtl ? 'right' : 'left',
    },
    dateCol: {
      width: '20%',
      textAlign: isRtl ? 'right' : 'left',
    },
    typeCol: {
      width: '20%',
      textAlign: isRtl ? 'right' : 'left',
    },
    footer: {
      marginTop: 40,
      borderTopWidth: 1,
      borderTopColor: '#e5e7eb',
      paddingTop: 20,
      flexDirection: isRtl ? 'row-reverse' : 'row',
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

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={{ flex: 1, alignItems: isRtl ? 'flex-end' : 'flex-start' }}>
            <Text style={styles.title}>{t('salarySettlementVoucher')}</Text>
            <View style={{ marginTop: 8, gap: 2, alignItems: isRtl ? 'flex-end' : 'flex-start' }}>
              <Text style={{ fontSize: 12, fontWeight: 'bold' }}>{t('employee')}: {staffName}</Text>
              {idNumber && <Text style={{ fontSize: 9, color: '#4b5563' }}>{t('idNumber')}: {idNumber}</Text>}
              {nationality && <Text style={{ fontSize: 9, color: '#4b5563' }}>{t('nationality')}: {nationality}</Text>}
            </View>
          </View>
          <View style={styles.meta}>
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#059669', marginBottom: 4 }}>
              {monthName} {settlement.year}
            </Text>
            <Text>Voucher #: SAL-{settlement.year}-{settlement.month}-{settlement.paidAt.toString().slice(0,4)}</Text>
            <Text>{t('date')} {format(new Date(settlement.paidAt), 'PPP')}</Text>
          </View>
        </View>

        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 9, color: '#4b5563', textAlign: isRtl ? 'right' : 'left' }}>
            {t('declarationText')}
          </Text>
        </View>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.label}>{t('baseSalary')}</Text>
            <Text style={styles.value}>{settlement.baseSalary.toFixed(2)}</Text>
          </View>
          
          {(settlement.overtimeAllowance || 0) > 0 && (
            <View style={styles.summaryItem}>
              <Text style={styles.label}>{t('overtime')}</Text>
              <Text style={styles.value}>{settlement.overtimeAllowance?.toFixed(2)}</Text>
            </View>
          )}

          {(settlement.transportAllowance || 0) > 0 && (
            <View style={styles.summaryItem}>
              <Text style={styles.label}>{t('transport')}</Text>
              <Text style={styles.value}>{settlement.transportAllowance?.toFixed(2)}</Text>
            </View>
          )}

          {(settlement.otherAllowance || 0) > 0 && (
            <View style={styles.summaryItem}>
              <Text style={styles.label}>{t('otherAllowance')}</Text>
              <Text style={styles.value}>{settlement.otherAllowance?.toFixed(2)}</Text>
            </View>
          )}

          <View style={styles.summaryItem}>
            <Text style={styles.label}>{t('deductionsTotal')}</Text>
            <Text style={[styles.value, { color: '#dc2626' }]}>- {settlement.advancesTally.toFixed(2)}</Text>
          </View>
          
          <View style={[styles.summaryItem, { backgroundColor: '#f0fdf4', borderRightWidth: 0, borderLeftWidth: 0 }]}>
            <Text style={styles.label}>{t('netSalaryPaid')}</Text>
            <Text style={[styles.value, { color: '#059669' }]}>{settlement.netPaid.toFixed(2)}</Text>
          </View>
          
          <View style={[styles.summaryItem, { borderBottomWidth: 0, borderRightWidth: 0, borderLeftWidth: 0 }]}>
            <Text style={styles.label}>{t('paymentMethod')}</Text>
            <Text style={styles.value}>{t(settlement.method.toLowerCase() as any) || settlement.method}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('deductionsTotal')}</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableColHeader]}>
              <View style={[styles.tableCol, styles.dateCol]}><Text>{t('date')}</Text></View>
              <View style={[styles.tableCol, styles.typeCol]}><Text>{t('type')}</Text></View>
              <View style={[styles.tableCol, styles.descCol]}><Text>{t('description')}</Text></View>
              <View style={[styles.tableCol, styles.amountCol]}><Text>{t('amount')}</Text></View>
            </View>
            {settlement.transactions.map((tx, i) => (
              <View key={i} style={styles.tableRow}>
                <View style={[styles.tableCol, styles.dateCol]}><Text>{format(new Date(tx.createdAt), 'dd/MM/yyyy')}</Text></View>
                <View style={[styles.tableCol, styles.typeCol]}><Text>{t(tx.type.toLowerCase() as any) || tx.type}</Text></View>
                <View style={[styles.tableCol, styles.descCol]}><Text>{tx.description || '-'}</Text></View>
                <View style={[styles.tableCol, styles.amountCol]}><Text>{tx.amount.toFixed(2)}</Text></View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <View>
            <Text style={styles.signatureLine}>{t('managerSignature')}</Text>
          </View>
          <View>
            <Text style={styles.signatureLine}>{t('employeeSignature')}</Text>
          </View>
        </View>

        <Text style={{ position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', fontSize: 8, color: '#999' }}>
          {t('officialRecordFooter')}
        </Text>
      </Page>
    </Document>
  );
}
