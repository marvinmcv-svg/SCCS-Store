import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { requireAdminPage } from '@/lib/admin';
import { salesReport, type Period } from '@/lib/reports';
import { formatBs } from '@/lib/money';
import { formatDate } from '@/lib/dates';
import { gradeLabel } from '@/config/catalog';
import { PageHeader, StatCard, Card, Table, Th, Td } from '@/components/admin/ui';
import { ReportCharts, PeriodTabs } from './report-charts';

export const metadata: Metadata = { title: 'Reportes' };

export default async function ReportsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ p?: string }> }) {
  const { locale } = await params;
  await requireAdminPage('viewReports');
  const t = await getTranslations();
  const raw = (await searchParams).p;
  const period: Period = raw === '7' || raw === '90' || raw === '365' ? raw : '30';
  const r = await salesReport(period);

  return (
    <>
      <PageHeader title={t('admin.reports.title')} actions={<PeriodTabs current={period} labels={{ '7': t('admin.reports.days7'), '30': t('admin.reports.days30'), '90': t('admin.reports.days90'), '365': t('admin.reports.year') }} />} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t('admin.reports.revenue')} value={formatBs(r.revenue)} />
        <StatCard label={t('admin.reports.orders')} value={r.orders} />
        <StatCard label={t('admin.reports.aov')} value={formatBs(r.aov)} />
        <StatCard label={t('admin.reports.units')} value={r.units} />
      </div>

      <ReportCharts
        series={r.series.map((d) => ({ label: d.day, value: d.revenue, sub: t('admin.common.results', { count: d.orders }) }))}
        byGrade={r.byGrade.map((g) => ({ label: g.label === '—' ? '—' : gradeLabel(g.label, locale), value: g.value }))}
        bySize={r.bySize}
        byMethod={r.byMethod.map((m) => ({ label: t(`checkout.method${m.label}` as 'checkout.methodQR'), value: m.value, sub: t('admin.common.results', { count: m.orders }) }))}
        labels={{
          sales: t('admin.reports.salesOverTime'),
          grade: t('admin.reports.demandGrade'),
          size: t('admin.reports.demandSize'),
          method: t('admin.reports.byMethod'),
          noData: t('admin.reports.noData'),
          table: t('admin.common.view'),
          date: t('admin.common.date'),
          revenue: t('admin.reports.revenue'),
        }}
        locale={locale}
      />

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card title={t('admin.reports.bestSellers')}>
          {r.best.length === 0 ? (
            <p className="t-caption text-ink-2">{t('admin.reports.noData')}</p>
          ) : (
            <Table compact className="mx-0">
              <thead>
                <tr>
                  <Th>{t('admin.reports.product')}</Th>
                  <Th className="text-right">{t('admin.reports.sold')}</Th>
                  <Th className="text-right">{t('admin.reports.revenueCol')}</Th>
                </tr>
              </thead>
              <tbody>
                {r.best.map((b) => (
                  <tr key={b.productId}>
                    <Td>{b.name}</Td>
                    <Td className="tabular text-right">{b.units}</Td>
                    <Td className="tabular text-right">{formatBs(b.revenue)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
        <Card title={t('admin.reports.reorder')}>
          {r.reorder.length === 0 ? (
            <p className="t-caption text-ink-2">{t('admin.dashboard.noQueue')}</p>
          ) : (
            <Table compact className="mx-0">
              <thead>
                <tr>
                  <Th>{t('admin.products.sku')}</Th>
                  <Th className="text-right">{t('admin.reports.stock')}</Th>
                  <Th className="text-right">{t('admin.reports.point')}</Th>
                  <Th className="text-right">30d</Th>
                  <Th className="text-right">{t('admin.reports.suggested')}</Th>
                </tr>
              </thead>
              <tbody>
                {r.reorder.map((x) => (
                  <tr key={x.sku}>
                    <Td>
                      <span className="font-mono text-[13px]">{x.sku}</span>
                      <span className="t-caption block text-ink-2">
                        {x.name} · {x.size}
                      </span>
                    </Td>
                    <Td className={`tabular text-right ${x.stock === 0 ? 'text-red' : ''}`}>{x.stock}</Td>
                    <Td className="tabular text-right text-ink-2">{x.reorderPoint}</Td>
                    <Td className="tabular text-right text-ink-2">{x.sold30}</Td>
                    <Td className="tabular text-right font-medium">+{x.suggested}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>
      <p className="t-caption mt-6 text-ink-3">{formatDate(new Date(), locale)} · America/La_Paz</p>
    </>
  );
}
