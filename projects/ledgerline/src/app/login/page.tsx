import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-2xl border border-line bg-card p-8 shadow-2xl shadow-black/40">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent font-bold text-[#0b1120]">
            LL
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Praktis</h1>
            <p className="text-sm text-slate-400">
              Masuk untuk melanjutkan
            </p>
          </div>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
