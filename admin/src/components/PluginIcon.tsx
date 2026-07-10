import React from 'react';

// The "Layer" glyph from the newer Strapi Design System, inlined (exact path) so it
// doesn't depend on the installed @strapi/icons version. Renders at currentColor.
const PluginIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" aria-hidden focusable="false" {...props}>
    <path
      fill="currentColor"
      d="M4.8.2c0-.11.09-.2.2-.2h18.8c.11 0 .2.09.2.2v4.4a.2.2 0 0 1-.2.2H5a.2.2 0 0 1-.2-.2V.2ZM0 9.8c0-.11.09-.2.2-.2H19c.11 0 .2.09.2.2v4.4a.2.2 0 0 1-.2.2H.2a.2.2 0 0 1-.2-.2V9.8ZM5 19.2a.2.2 0 0 0-.2.2v4.4c0 .11.09.2.2.2h18.8a.2.2 0 0 0 .2-.2v-4.4a.2.2 0 0 0-.2-.2H5Z"
    />
  </svg>
);

export { PluginIcon };
