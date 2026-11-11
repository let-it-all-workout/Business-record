import { ReactNode } from 'react';
import ThemeToggle from './ThemeToggle';

export default function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-8">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-5xl grid lg:grid-cols-[1.05fr_0.95fr] gap-6 items-stretch">
        <aside className="hidden lg:flex flex-col justify-between rounded-3xl bg-teal-800 text-white p-10 min-h-[32rem]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 grid place-items-center font-bold tracking-tight">BR</div>
            <div>
              <p className="text-lg font-semibold leading-none">Business Record</p>
              <p className="text-sm text-teal-100 mt-1">Shop inventory</p>
            </div>
          </div>
          <div>
            <h2 className="text-4xl font-semibold leading-tight tracking-tight">
              Stock, sales, and profit in one place.
            </h2>
            <p className="mt-4 text-teal-100 text-lg leading-relaxed max-w-md">
              Record what you buy, what you sell, and what the shop keeps.
            </p>
          </div>
          <p className="text-sm text-teal-100">Each business stays separate. Staff see only what you allow.</p>
        </aside>
        <div className="card w-full p-6 sm:p-8 max-h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="mb-6">
            <div className="lg:hidden flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-teal-700 text-white grid place-items-center font-bold">BR</div>
              <p className="font-semibold text-slate-900">Business Record</p>
            </div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">{title}</h1>
            <p className="text-slate-600 mt-1">{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
