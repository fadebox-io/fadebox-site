import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docs: [
    'intro',
    {
      type: 'category',
      label: 'Getting started',
      collapsed: false,
      items: ['getting-started/installation'],
    },
    {
      type: 'category',
      label: 'Guides',
      collapsed: false,
      items: ['guides/oidc-sso', 'guides/ci-api-keys'],
    },
  ],
};

export default sidebars;
