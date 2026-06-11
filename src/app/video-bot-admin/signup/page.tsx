import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function SignupDisabledPage() {
  return (
    <div className="min-h-screen bg-[#050810] flex items-center justify-center p-8">
      <div className="w-full max-w-md text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">Access Restricted</h1>
        <p className="text-white/40 text-sm leading-relaxed mb-8">
          Self-registration is disabled. Admin accounts are managed internally.
          Please contact your administrator to gain access.
        </p>
        <Link
          href="/admin/login"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-all text-sm font-medium"
        >
          ← Back to Login
        </Link>
        <p className="mt-8 text-xs text-white/20">
          © {new Date().getFullYear()} ElastiCrew. All rights reserved.
        </p>
      </div>
    </div>
  );
}
