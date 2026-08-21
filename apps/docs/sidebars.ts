import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docs: [
    'intro',
    {
      type: 'category',
      label: 'Getting started',
      collapsed: false,
      items: [
        'getting-started/installation',
        'getting-started/first-environment',
      ],
    },
    {
      type: 'category',
      label: 'Concepts',
      collapsed: false,
      items: [
        'concepts/templates',
        'concepts/environments',
        'concepts/instances',
        'concepts/runtimes',
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      collapsed: false,
      items: [
        'guides/template-authoring',
        'guides/ingress',
        'guides/remote-runtimes',
        'guides/reclaiming-resources',
        'guides/deploy-gcp',
        'guides/git-value-sources',
        'guides/private-registries',
        'guides/access-control',
        'guides/oidc-sso',
        'guides/ci-api-keys',
        'guides/cli',
        'guides/mcp',
        'guides/audit-log',
        'guides/licensing',
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      collapsed: false,
      items: ['reference/configuration'],
    },
  ],
};

export default sidebars;
