'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';

/**
 * HUD-styled wrapper around RainbowKit ConnectButton.
 * Matches the .tb-wallet style from the approved mockup:
 * cyan border, angled clip-path, Barlow Condensed font.
 */
export function HudConnectButton() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        if (!mounted) return null;

        const connected = account && chain;

        if (!connected) {
          return (
            <button
              onClick={openConnectModal}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 12px',
                fontFamily: 'var(--hud-font-head)',
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                background: 'transparent',
                border: '1px solid var(--hud-cyan, #00e5ff)',
                color: 'var(--hud-cyan, #00e5ff)',
                cursor: 'pointer',
                clipPath: 'polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,6px 100%,0 calc(100% - 6px))',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,229,255,0.08)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <i className="fa-solid fa-wallet text-[9px]" />
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
                gap: 5,
                padding: '5px 12px',
                fontFamily: 'var(--hud-font-head)',
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                background: 'rgba(255,51,85,0.12)',
                border: '1px solid rgba(255,51,85,0.4)',
                color: 'var(--hud-red, #ff3355)',
                cursor: 'pointer',
                clipPath: 'polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,6px 100%,0 calc(100% - 6px))',
              }}
            >
              <i className="fa-solid fa-triangle-exclamation text-[9px]" />
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
              gap: 5,
              padding: '5px 12px',
              fontFamily: 'var(--hud-font-head)',
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              background: 'rgba(0,229,255,0.06)',
              border: '1px solid rgba(0,229,255,0.3)',
              color: 'var(--hud-cyan, #00e5ff)',
              cursor: 'pointer',
              clipPath: 'polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,6px 100%,0 calc(100% - 6px))',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,229,255,0.12)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,229,255,0.06)')}
          >
            <i className="fa-solid fa-circle-check text-[9px]" style={{ color: 'var(--hud-green)' }} />
            {account.displayName}
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}
