import { Logo } from '../../components/layout/Logo.jsx';

const SAMPLE = [
  {
    label: 'Salary from Acme Technologies',
    meta: 'Salary, 1 Oct',
    amount: '+₹72,000',
    income: true,
  },
  { label: 'House rent', meta: 'Rent & Housing, 2 Oct', amount: '−₹16,000' },
  { label: 'Swiggy order', meta: 'Food & Dining, 24 Oct', amount: '−₹420' },
];

/** A static preview of the product: this month's runway and a few ledger lines. */
function ProductPreview() {
  return (
    <div
      aria-hidden="true"
      className="rounded-2xl bg-white/[0.07] p-6 ring-1 ring-white/10 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between text-sm text-brand-100">
        <span>October 2026</span>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-ink">
          Close to limit
        </span>
      </div>
      <p className="mt-4 flex items-baseline gap-2.5">
        <span className="figure text-[40px] leading-none font-semibold text-white">₹7,363</span>
        <span className="text-brand-100">left to spend</span>
      </p>
      <div className="relative mt-5 h-2.5 rounded-full bg-white/15">
        <div className="h-full w-[86%] rounded-full bg-warning" />
        <div className="absolute -top-1 -bottom-1 left-[84%] w-0.5 rounded-full bg-white" />
      </div>
      <ul className="mt-6 divide-y divide-white/10 text-sm">
        {SAMPLE.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-4 py-3">
            <div className="min-w-0">
              <p className="truncate font-medium text-white">{row.label}</p>
              <p className="text-brand-100/80">{row.meta}</p>
            </div>
            <span
              className={`figure font-semibold tabular-nums ${row.income ? 'text-brand-200' : 'text-white'}`}
            >
              {row.amount}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Split layout for login/register: product story on the left, the form on the right. */
export function AuthLayout({ children }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <aside className="relative hidden overflow-hidden bg-brand-800 px-12 py-10 lg:flex lg:flex-col xl:px-16">
        <Logo inverse />
        <div className="my-auto max-w-lg py-12">
          <p className="text-[44px] leading-[1.05] font-semibold tracking-tight text-white xl:text-[52px]">
            Know where every rupee goes.
          </p>
          <p className="mt-5 max-w-md text-lg text-brand-100">
            Log your income and spending, set a monthly budget, and see how your money moves month
            by month.
          </p>
          <div className="mt-10">
            <ProductPreview />
          </div>
        </div>
        <p className="text-sm text-brand-100/70">Built with React, Express and PostgreSQL.</p>
      </aside>

      <main className="flex min-h-dvh flex-col px-5 py-8 sm:px-10 lg:min-h-0 lg:justify-center lg:px-16">
        <Logo className="mb-10 lg:hidden" />
        <div className="w-full max-w-md lg:mx-auto">{children}</div>
      </main>
    </div>
  );
}
