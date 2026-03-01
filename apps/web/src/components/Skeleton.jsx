const shimmerStyle = {
  background: 'linear-gradient(90deg, var(--bg-tertiary) 25%, var(--bg-secondary) 50%, var(--bg-tertiary) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s infinite ease-in-out',
  borderRadius: 'var(--radius-md)',
};

function Bone({ width = '100%', height = 14, borderRadius, style }) {
  return (
    <div style={{
      ...shimmerStyle,
      width,
      height,
      borderRadius: borderRadius || 'var(--radius-md)',
      ...style,
    }} />
  );
}

export function IdeaCardSkeleton() {
  return (
    <div className="card" style={{ padding: 20, display: 'flex', gap: 16 }}>
      {/* Vote placeholder */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 40 }}>
        <Bone width={20} height={20} borderRadius="var(--radius-sm)" />
        <Bone width={28} height={16} borderRadius="var(--radius-sm)" />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Badges */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <Bone width={72} height={22} borderRadius="var(--radius-full)" />
          <Bone width={56} height={22} borderRadius="var(--radius-full)" />
        </div>
        {/* Title */}
        <Bone width="75%" height={18} style={{ marginBottom: 8 }} />
        {/* Summary */}
        <Bone width="100%" height={14} style={{ marginBottom: 5 }} />
        <Bone width="60%" height={14} style={{ marginBottom: 14 }} />
        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bone width={28} height={28} borderRadius="50%" />
            <Bone width={80} height={13} />
            <Bone width={50} height={12} />
          </div>
          <Bone width={40} height={13} />
        </div>
      </div>
    </div>
  );
}

export function SurveyCardSkeleton() {
  return (
    <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Bone width={60} height={22} borderRadius="var(--radius-full)" />
        <Bone width={40} height={16} />
      </div>
      {/* Title */}
      <Bone width="70%" height={18} />
      {/* Question */}
      <Bone width="90%" height={14} />
      {/* Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
        <Bone width="100%" height={36} borderRadius="var(--radius-md)" />
        <Bone width="100%" height={36} borderRadius="var(--radius-md)" />
        <Bone width="100%" height={36} borderRadius="var(--radius-md)" />
      </div>
      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
        <Bone width={28} height={28} borderRadius="50%" />
        <Bone width={90} height={13} />
      </div>
    </div>
  );
}

export function KanbanCardSkeleton() {
  return (
    <div style={{
      padding: '12px 14px',
      background: 'var(--bg-primary)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border-default)',
    }}>
      <Bone width="80%" height={14} style={{ marginBottom: 8 }} />
      <Bone width="50%" height={12} style={{ marginBottom: 10 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Bone width={24} height={24} borderRadius="50%" />
        <Bone width={32} height={12} />
      </div>
    </div>
  );
}
