import { PLUGIN_ID } from "./pluginId";
import { Initializer } from "./components/Initializer";
import { PluginIcon } from "./components/PluginIcon";
import { getTranslation } from "./utils/getTranslation";

// Strapi merges every plugin's messages into one flat catalogue, so ids are namespaced
// with the plugin id (the translation files themselves keep short keys).
const prefixKeys = (data: Record<string, string>) =>
  Object.fromEntries(Object.entries(data).map(([key, value]) => [getTranslation(key), value]));

export default {
  register(app: any) {
    app.addMenuLink({
      to: `plugins/${PLUGIN_ID}`,
      icon: PluginIcon,
      intlLabel: {
        id: getTranslation("plugin.name"),
        defaultMessage: 'Form Builder',
      },
      Component: async () => {
        const { App } = await import("./pages/App");

        return App;
      },
    });

    app.registerPlugin({
      id: PLUGIN_ID,
      initializer: Initializer,
      isReady: false,
      name: PLUGIN_ID,
    });
  },

  async registerTrads({ locales }: { locales: string[] }) {
    return Promise.all(
      locales.map(async (locale) => {
        try {
          const { default: data } = await import(
            `./translations/${locale}.json`
          );

          return { data: prefixKeys(data), locale };
        } catch {
          return { data: {}, locale };
        }
      })
    );
  },
};