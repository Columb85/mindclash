'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';

/**
 * HUD-styled wrapper around RainbowKit ConnectButton.
 * Matches the .tb-wallet style from the approved mockup:
 * cyan border, angled clip-path, Barlow Condensed font.
 */
const CONNECT_BTN_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '6px 10px',
  fontFamily: 'var(--hud-font-head)',
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  background: 'transparent',
  border: '1px solid var(--hud-cyan, #00e5ff)',
  color: 'var(--hud-cyan, #00e5ff)',
  clipPath: 'polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))',
};

function ConnectPlaceholder() {
  return (
    <div className="hud-topbar-placeholder" aria-hidden>
      <button type="button" tabIndex={-1} style={CONNECT_BTN_STYLE} disabled>
        <i className="fa-solid fa-wallet text-[10px]" />
        Connect
      </button>
    </div>
  );
}

export function HudConnectButton() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        if (!mounted) return <ConnectPlaceholder />;

        const connected = account && chain;

        if (!connected) {
          return (
            <button
              onClick={openConnectModal}
              style={{ ...CONNECT_BTN_STYLE, cursor: 'pointer', transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,229,255,0.08)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <i className="fa-solid fa-wallet text-[10px]" />
              Connect
            </button>
          );
        }

        if (chain.unsupported) {
          return (
            <button
              onClick={openChainModal}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '6px 10px',
                fontFamily: 'var(--hud-font-head)',
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                background: 'rgba(255,51,85,0.12)',
                border: '1px solid rgba(255,51,85,0.4)',
                color: 'var(--hud-red, #ff3355)',
                cursor: 'pointer',
                clipPath: 'polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))',
              }}
            >
              <i className="fa-solid fa-triangle-exclamation text-[10px]" />
              Wrong Network
            </button>
          );
        }

        return (
          <button
            onClick={openAccountModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '6px 10px',
              fontFamily: 'var(--hud-font-head)',
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              background: 'rgba(0,229,255,0.06)',
              border: '1px solid rgba(0,229,255,0.3)',
              color: 'var(--hud-cyan, #00e5ff)',
              cursor: 'pointer',
              clipPath: 'polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,229,255,0.12)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,229,255,0.06)')}
          >
            <i className="fa-solid fa-circle-check text-[10px]" style={{ color: 'var(--hud-green)' }} />
            {account.displayName}
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}
