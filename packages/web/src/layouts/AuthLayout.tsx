import { Leaf } from 'lucide-react';

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="p-3 bg-green-600 rounded-xl"><Leaf className="w-8 h-8 text-white" /></div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">SmartSeed</h1>
          <p className="text-gray-500 mt-1">Seed Supply Chain Traceability Platform</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          {children}
        </div>
      </div>
    </div>
  );
}

