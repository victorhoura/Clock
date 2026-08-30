import type { TeamMember } from '../../types'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function Avatar({
  user,
  size = 36,
}: {
  user: Pick<TeamMember, 'name' | 'color'> & Partial<Pick<TeamMember, 'avatarUrl'>>
  size?: number
}) {
  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.name}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ backgroundColor: user.color, width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials(user.name)}
    </div>
  )
}
