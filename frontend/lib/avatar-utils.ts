const avatarColors = [
  { bg: "bg-blue-500", text: "text-white" },
  { bg: "bg-emerald-500", text: "text-white" },
  { bg: "bg-violet-500", text: "text-white" },
  { bg: "bg-amber-500", text: "text-white" },
  { bg: "bg-rose-500", text: "text-white" },
  { bg: "bg-cyan-500", text: "text-white" },
  { bg: "bg-indigo-500", text: "text-white" },
  { bg: "bg-pink-500", text: "text-white" },
]

export function getAvatarColor(name: string) {
  const index = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % avatarColors.length
  return avatarColors[index]
}

export function getInitials(name: string) {
  const parts = name.split(" ")
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export function getAvatarUrl(name: string, gender?: "male" | "female") {
  const seed = name.toLowerCase().replace(/\s/g, "-")
  const genderQuery = gender || (Math.random() > 0.5 ? "male" : "female")
  return `/placeholder.svg?height=100&width=100&query=${genderQuery} professional headshot ${seed}`
}
