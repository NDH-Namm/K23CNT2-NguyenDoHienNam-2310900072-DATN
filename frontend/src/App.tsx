
import { Monitor, Package, Users, Warehouse } from "lucide-react";

function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 px-8 py-5">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <div className="rounded-xl bg-blue-600 p-2">
            <Warehouse size={24} />
          </div>

          <div>
            <h1 className="text-xl font-bold">
              DEVMaster
            </h1>
            <p className="text-sm text-slate-400">
              Asset Management System
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-8 py-12">
        <div className="mb-10">
          <p className="mb-2 text-sm font-medium text-blue-400">
            HỆ THỐNG QUẢN LÝ NỘI BỘ
          </p>

          <h2 className="text-3xl font-bold">
            Chào mừng đến với DevMaster
          </h2>

          <p className="mt-3 text-slate-400">
            Quản lý cơ sở vật chất, tài sản và thiết bị doanh nghiệp.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {[
            {
              title: "Quản lý tài sản",
              description: "Theo dõi và quản lý tài sản doanh nghiệp.",
              icon: Package,
            },
            {
              title: "Quản lý nhân sự",
              description: "Quản lý tài khoản và phòng ban.",
              icon: Users,
            },
            {
              title: "Quản lý thiết bị",
              description: "Theo dõi tình trạng và sử dụng thiết bị.",
              icon: Monitor,
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-blue-500"
              >
                <div className="mb-5 inline-flex rounded-xl bg-blue-500/10 p-3 text-blue-400">
                  <Icon size={26} />
                </div>

                <h3 className="mb-2 text-lg font-semibold">
                  {item.title}
                </h3>

                <p className="text-sm leading-6 text-slate-400">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-10 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <p className="font-medium text-emerald-400">
            Frontend đã sẵn sàng!
          </p>
          <p className="mt-1 text-sm text-slate-400">
            React, TypeScript, Tailwind CSS v4 và Lucide React
            đã được cấu hình.
          </p>
        </div>
      </main>
    </div>
  );
}

export default App;
