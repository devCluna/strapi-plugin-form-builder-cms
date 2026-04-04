import React, { useState } from 'react';
import { Modal, Box, Typography, Button, Flex } from '@strapi/design-system';
import { Check, Duplicate } from '@strapi/icons';

interface Props {
  formId: number | string;
  open: boolean;
  onClose: () => void;
}

export function EmbedModal({ formId, open, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const origin = window.location.origin;
  const snippet = `<div id="sfb-form-${formId}"></div>\n<script\n  src="${origin}/api/strapi-plugin-form-builder-cms/embed.js"\n  data-form-id="${formId}"\n  async\n><\/script>`;

  const copy = () => {
    navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Modal.Root open={open} onOpenChange={(v: boolean) => !v && onClose()}>
      <Modal.Content style={{ maxWidth: 600, width: '100%' }}>
        <Modal.Header>
          <Typography variant="beta">Embed this form</Typography>
        </Modal.Header>

        <Modal.Body>
          <Flex direction="column" gap={3}>
            <Typography variant="pi" textColor="neutral600">
              Paste this snippet into your website where you want the form to appear.
            </Typography>
            <pre
              style={{
                margin: 0,
                background: '#1e1e2e',
                borderRadius: 6,
                padding: '16px 20px',
                overflowX: 'auto',
                whiteSpace: 'pre',
                color: '#cdd6f4',
                fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
                fontSize: 13,
                lineHeight: 1.7,
                cursor: 'text',
                userSelect: 'all',
              }}
              onClick={(e) => {
                const sel = window.getSelection();
                const range = document.createRange();
                range.selectNodeContents(e.currentTarget);
                sel?.removeAllRanges();
                sel?.addRange(range);
              }}
            >
              {snippet}
            </pre>
          </Flex>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="tertiary" onClick={onClose}>Cancel</Button>
          <Button
            startIcon={copied ? <Check /> : <Duplicate />}
            onClick={copy}
            variant={copied ? 'success' : 'default'}
          >
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}
