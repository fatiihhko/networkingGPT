import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const avatarVariants = cva(
  "relative flex shrink-0 overflow-hidden rounded-full ring-2 ring-border/20 transition-all duration-200",
  {
    variants: {
      size: {
        xs: "h-6 w-6",
        sm: "h-8 w-8",
        md: "h-10 w-10",
        lg: "h-12 w-12",
        xl: "h-16 w-16",
        "2xl": "h-20 w-20",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
)

const avatarImageVariants = cva(
  "aspect-square h-full w-full object-cover",
  {
    variants: {
      size: {
        xs: "text-xs",
        sm: "text-sm",
        md: "text-sm",
        lg: "text-base",
        xl: "text-lg",
        "2xl": "text-xl",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
)

const avatarFallbackVariants = cva(
  "flex h-full w-full items-center justify-center rounded-full font-medium text-foreground",
  {
    variants: {
      size: {
        xs: "text-xs",
        sm: "text-sm",
        md: "text-sm",
        lg: "text-base",
        xl: "text-lg",
        "2xl": "text-xl",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
)

export interface AvatarProps
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>,
    VariantProps<typeof avatarVariants> {
  src?: string
  alt?: string
  fallback?: string
  status?: "online" | "offline" | "away" | "busy"
  showStatus?: boolean
  className?: string
}

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  AvatarProps
>(({ 
  className, 
  size, 
  src, 
  alt, 
  fallback, 
  status = "offline", 
  showStatus = false,
  ...props 
}, ref) => {
  // Generate initials from name or fallback
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  // Generate gradient background based on name/id
  const getGradientBackground = (name: string) => {
    const hash = name.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0)
      return a & a
    }, 0)
    
    const gradients = [
      "from-blue-500 to-cyan-500",
      "from-purple-500 to-pink-500", 
      "from-green-500 to-emerald-500",
      "from-orange-500 to-red-500",
      "from-indigo-500 to-purple-500",
      "from-teal-500 to-blue-500",
      "from-pink-500 to-rose-500",
      "from-yellow-500 to-orange-500",
    ]
    
    return gradients[Math.abs(hash) % gradients.length]
  }

  const displayName = fallback || alt || "User"
  const initials = getInitials(displayName)
  const gradientClass = getGradientBackground(displayName)

  const statusColors = {
    online: "bg-green-500",
    offline: "bg-gray-400",
    away: "bg-yellow-500", 
    busy: "bg-red-500"
  }

  const statusSizes = {
    xs: "h-1.5 w-1.5",
    sm: "h-2 w-2", 
    md: "h-2.5 w-2.5",
    lg: "h-3 w-3",
    xl: "h-3.5 w-3.5",
    "2xl": "h-4 w-4"
  }

  return (
    <div className="relative inline-block">
      <AvatarPrimitive.Root
        ref={ref}
        className={cn(avatarVariants({ size }), className)}
        {...props}
      >
        <AvatarPrimitive.Image
          className={cn(avatarImageVariants({ size }))}
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
        />
        <AvatarPrimitive.Fallback
          className={cn(
            avatarFallbackVariants({ size }),
            `bg-gradient-to-br ${gradientClass}`
          )}
          delayMs={600}
        >
          {initials}
        </AvatarPrimitive.Fallback>
      </AvatarPrimitive.Root>
      
      {showStatus && (
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-background",
            statusColors[status],
            statusSizes[size || "md"]
          )}
        />
      )}
    </div>
  )
})
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = AvatarPrimitive.Image
const AvatarFallback = AvatarPrimitive.Fallback

export { Avatar, AvatarImage, AvatarFallback, avatarVariants, avatarImageVariants, avatarFallbackVariants }
