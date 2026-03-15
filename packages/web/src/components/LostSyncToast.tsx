type LostSyncToastProps = { visible: boolean };

export function LostSyncToast({ visible }: LostSyncToastProps) {
  if (!visible) return null;
  return (
    <div style={{
      position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(0,0,0,0.8)', color: '#fff', padding: '10px 20px',
      borderRadius: 20, fontFamily: 'sans-serif', fontSize: 14, zIndex: 200,
      border: '1px solid #444',
    }}>
      Lost sync — reconnecting...
    </div>
  );
}
