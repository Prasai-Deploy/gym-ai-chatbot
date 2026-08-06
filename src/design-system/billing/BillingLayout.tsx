import React, { useState } from 'react';
import { BillingHero } from './BillingHero';
import { RevenueOverview } from './RevenueOverview';
import { RevenueTrendChart } from './RevenueTrendChart';
import { RevenueForecast } from './RevenueForecast';
import { MembershipPlans } from './MembershipPlans';
import { RenewalCenter } from './RenewalCenter';
import { DunningCenter } from './DunningCenter';
import { InvoicesTable } from './InvoicesTable';
import { InvoicePreview } from './InvoicePreview';
import { POSPanel } from './POSPanel';
import { WalkInSales } from './WalkInSales';
import { RevenueByTrainer } from './RevenueByTrainer';
import { RevenueByPlan } from './RevenueByPlan';
import { DiscountCoupons } from './DiscountCoupons';
import { PayoutCenter } from './PayoutCenter';
import { AIRevenueInsights } from './AIRevenueInsights';
import { FinancialHealth } from './FinancialHealth';
import { BillingFilters } from './BillingFilters';
import { PageContainer } from '../shell/PageContainer';
import { cn } from '../tokens';

export interface BillingLayoutProps {
  className?: string;
}

export const BillingLayout: React.FC<BillingLayoutProps> = React.memo(({
  className,
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isInvoicePreviewOpen, setIsInvoicePreviewOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  const handleSelectInvoice = (id: string) => {
    setSelectedInvoiceId(id);
    setIsInvoicePreviewOpen(true);
  };

  return (
    <PageContainer maxWidth="xl" className={cn('gap-6', className)}>
      {/* 1. Hero Banner */}
      <BillingHero mrr={48250} arr={579000} ltv={1840} forecast90Days={158000} />

      {/* 2. Key Revenue Stats */}
      <RevenueOverview />

      {/* 3. Trinity AI Revenue Insights & Financial Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AIRevenueInsights />
        <FinancialHealth score={94} />
      </div>

      {/* 4. Billing Navigation Tabs */}
      <BillingFilters activeTab={activeTab} onChangeTab={setActiveTab} />

      {/* 5. 12-Month MRR Growth & 90-Day Forecast */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RevenueTrendChart className="lg:col-span-2" />
        <RevenueForecast />
      </div>

      {/* 6. Dunning Recovery Engine & Renewal Control Center */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DunningCenter />
        <RenewalCenter />
      </div>

      {/* 7. Front Desk POS Terminal & Walk-in Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <POSPanel onProcessCheckout={(tot) => console.log('POS Total Charged:', tot)} />
        <WalkInSales />
      </div>

      {/* 8. Active Pricing Tiers & Discount Coupons */}
      <MembershipPlans />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DiscountCoupons />
        <PayoutCenter />
      </div>

      {/* 9. Financial Invoices Ledger */}
      <InvoicesTable onSelectInvoice={handleSelectInvoice} />

      {/* 10. Multi-Dimension Revenue Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueByPlan />
        <RevenueByTrainer />
      </div>

      {/* 11. Slide-over Invoice Preview Drawer */}
      <InvoicePreview
        isOpen={isInvoicePreviewOpen}
        onClose={() => setIsInvoicePreviewOpen(false)}
        invoiceNum={selectedInvoiceId || 'INV-2024-001'}
      />
    </PageContainer>
  );
});

BillingLayout.displayName = 'BillingLayout';
