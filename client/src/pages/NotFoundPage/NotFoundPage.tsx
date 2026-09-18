import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FileQuestion, ArrowLeft, Home } from "lucide-react";
import { Page } from "@/components/Page";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Page showBreadcrumbs={false}>
      <Page.Header>
        <Page.HeaderRow>
          <Page.TitleGroup>
            <Page.Title>{t("notFound.title")}</Page.Title>
            <Page.Description>{t("notFound.description")}</Page.Description>
          </Page.TitleGroup>
          <Page.Actions>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(-1)}
              className="h-7 text-xs font-bold gap-1.5 cursor-pointer shadow-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t("notFound.goBack")}
            </Button>
            <Button
              size="sm"
              onClick={() => navigate("/")}
              className="h-7 text-xs font-bold gap-1.5 cursor-pointer shadow-xs"
            >
              <Home className="h-3.5 w-3.5" />
              {t("notFound.backHome")}
            </Button>
          </Page.Actions>
        </Page.HeaderRow>
      </Page.Header>
      <div className="relative min-h-[70vh] w-full flex flex-col items-center justify-center overflow-hidden transition-colors duration-300">
        {/* Visual background ambient blobs */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse pointer-events-none" />
        <div
          className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse pointer-events-none"
        />

        <div className="relative z-10 w-full max-w-md bg-card border border-border rounded-2xl shadow-xl p-8 md:p-12 text-center transition-all duration-300">
          {/* Floating Animated 404 Visual Icon */}
          <div className="mx-auto w-20 h-20 bg-muted rounded-2xl flex items-center justify-center text-muted-foreground shadow-inner mb-6 relative group">
            <FileQuestion className="h-10 w-10 animate-pulse group-hover:scale-110 transition-transform duration-300" />
            <div className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border border-background tracking-wider">
              {t("notFound.errorCode")}
            </div>
          </div>

          {/* 404 Giant Text */}
          <h1
            className="text-8xl font-black font-heading tracking-tighter text-foreground select-none"
          >
            404
          </h1>

          {/* Text descriptions */}
          <h2 className="text-xl font-bold text-foreground mt-4">{t("notFound.title")}</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">{t("notFound.description")}</p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(-1)}
              className="flex-1 h-9 text-xs font-bold gap-2 cursor-pointer shadow-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t("notFound.goBack")}
            </Button>

            <Button
              size="sm"
              onClick={() => navigate("/")}
              className="flex-1 h-9 text-xs font-bold gap-2 cursor-pointer shadow-xs"
            >
              <Home className="h-3.5 w-3.5" />
              {t("notFound.backHome")}
            </Button>
          </div>
        </div>
      </div>
    </Page>
  );
}

export default NotFoundPage;
