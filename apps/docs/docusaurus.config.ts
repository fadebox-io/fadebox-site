import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// The docs app deploys under the landing page: the Pages workflow copies its
// build output into the landing's dist/docs, so both live on one origin.
// Switching to the fadebox.dev custom domain later means changing url/baseUrl
// here and base in apps/landing/astro.config.mjs together.
const config: Config = {
  title: 'Fadebox',
  tagline: 'Self-hosted ephemeral environments on Docker',
  // The landing's light logo mark, same file it serves as its own favicon.
  favicon: 'img/logo-mark.svg',

  future: {
    v4: true,
  },

  url: 'https://hlavki.github.io',
  baseUrl: '/fadebox-site/docs/',

  organizationName: 'hlavki',
  projectName: 'fadebox-site',

  // A broken link is a build failure, not a warning — this is the PR gate.
  onBrokenLinks: 'throw',
  onBrokenAnchors: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          // Docs are the whole app; the /docs prefix comes from baseUrl.
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/hlavki/fadebox-site/edit/master/apps/docs/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themes: [
    [
      '@easyops-cn/docusaurus-search-local',
      {
        hashed: true,
        docsRouteBasePath: '/',
        indexBlog: false,
      },
    ],
  ],

  themeConfig: {
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      logo: {
        alt: 'Fadebox',
        src: 'img/logo-lockup.svg',
        srcDark: 'img/logo-lockup-dark.svg',
        width: 128,
        height: 26,
      },
      items: [
        {
          type: 'docsVersionDropdown',
          position: 'right',
        },
        {
          href: 'https://hlavki.github.io/fadebox-site/',
          label: 'Website',
          position: 'right',
        },
        {
          href: 'https://github.com/hlavki/fadebox-site',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          items: [
            {
              label: 'Website',
              href: 'https://hlavki.github.io/fadebox-site/',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/hlavki/fadebox-site',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Michal Hlavac`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'yaml'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
