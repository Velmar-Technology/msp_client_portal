import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FileQuestion, ArrowLeft, Home } from "lucide-react";
import { Page } from "@/components/Page";

export function NotFoundPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Page showBreadcrumbs={false}>
      <div className="relative min-h-[80vh] w-full flex flex-col items-center justify-center overflow-hidden transition-colors duration-300">
        {/* Visual background ambient blobs */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-zinc-400/10 dark:bg-zinc-800/10 rounded-full blur-3xl animate-pulse pointer-events-none" />
        <div
          className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-zinc-400/10 dark:bg-zinc-800/10 rounded-full blur-3xl animate-pulse pointer-events-none"
          style={{ animationDelay: "2s" }}
        />

        <div className="relative z-10 w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl shadow-xl p-8 md:p-12 text-center transition-all duration-300">
          {/* Floating Animated 404 Visual Icon */}
          <div className="mx-auto w-20 h-20 bg-zinc-100 dark:bg-zinc-800/50 rounded-2xl flex items-center justify-center text-zinc-600 dark:text-zinc-400 shadow-inner mb-6 relative group">
            <FileQuestion className="h-10 w-10 animate-pulse group-hover:scale-110 transition-transform duration-300" />
            <div className="absolute -top-1.5 -right-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border border-white dark:border-zinc-900 tracking-wider">
              {t("notFound.errorCode")}
            </div>
          </div>

          {/* 404 Giant Text */}
          <h1
            className="text-8xl font-black tracking-tighter text-zinc-900 dark:text-zinc-50 select-none animate-bounce"
            style={{ animationDuration: "4s", fontFamily: "var(--font-heading)" }}
          >
            404
          </h1>

          {/* Text descriptions */}
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-4">{t("notFound.title")}</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 max-w-xs mx-auto">{t("notFound.description")}</p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <button
              onClick={() => navigate(-1)}
              className="flex-1 flex items-center justify-center gap-2 bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 text-zinc-700 dark:text-zinc-200 text-xs font-bold py-2.5 px-4 rounded-xl border border-zinc-200/50 dark:border-zinc-700/50 transition-all active:scale-[0.98]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t("notFound.goBack")}
            </button>

            <button
              onClick={() => navigate("/")}
              className="flex-1 flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-50 dark:hover:bg-zinc-200 text-zinc-50 dark:text-zinc-900 text-xs font-bold py-2.5 px-4 rounded-xl transition-all active:scale-[0.98]"
            >
              <Home className="h-3.5 w-3.5" />
              {t("notFound.backHome")}
            </button>
          </div>
        </div>
      </div>
    </Page>
  );
}

export default NotFoundPage;
