import "react-i18next";
import type enUS from "@/locales/en_US.json";

declare module "react-i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: {
      translation: typeof enUS;
    };
  }
}
