import * as React from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface AlertDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

interface AlertDialogTriggerProps {
  asChild?: boolean
  children: React.ReactNode
}

interface AlertDialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

const AlertDialog = ({ open, onOpenChange, children }: AlertDialogProps) => {
  const [isOpen, setIsOpen] = React.useState(open ?? false)

  React.useEffect(() => {
    if (open !== undefined) {
      setIsOpen(open)
    }
  }, [open])

  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen)
    onOpenChange?.(newOpen)
  }

  return (
    <AlertDialogContext.Provider value={{ isOpen, setOpen: handleOpenChange }}>
      {children}
    </AlertDialogContext.Provider>
  )
}

const AlertDialogContext = React.createContext<{
  isOpen: boolean
  setOpen: (open: boolean) => void
}>({
  isOpen: false,
  setOpen: () => {},
})

const useAlertDialog = () => {
  const context = React.useContext(AlertDialogContext)
  if (!context) {
    throw new Error("useAlertDialog must be used within AlertDialog")
  }
  return context
}

const AlertDialogTrigger = ({ asChild, children }: AlertDialogTriggerProps) => {
  const { setOpen } = useAlertDialog()

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: () => setOpen(true),
    } as any)
  }

  return (
    <button onClick={() => setOpen(true)} type="button">
      {children}
    </button>
  )
}

const AlertDialogContent = React.forwardRef<HTMLDivElement, AlertDialogContentProps>(
  ({ className, children, ...props }, ref) => {
    const { isOpen, setOpen } = useAlertDialog()

    if (!isOpen) return null

    return (
      <>
        <div
          className="fixed inset-0 z-50 bg-black/80"
          onClick={() => setOpen(false)}
        />
        <div className="fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%]">
          <div
            ref={ref}
            className={cn(
              "grid w-full max-w-lg gap-4 border bg-background p-6 shadow-lg sm:rounded-lg",
              className
            )}
            {...props}
          >
            {children}
          </div>
        </div>
      </>
    )
  }
)
AlertDialogContent.displayName = "AlertDialogContent"

const AlertDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col space-y-2 text-center sm:text-left", className)}
    {...props}
  />
)
AlertDialogHeader.displayName = "AlertDialogHeader"

const AlertDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
    {...props}
  />
)
AlertDialogFooter.displayName = "AlertDialogFooter"

const AlertDialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn("text-lg font-semibold", className)}
    {...props}
  />
))
AlertDialogTitle.displayName = "AlertDialogTitle"

const AlertDialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
AlertDialogDescription.displayName = "AlertDialogDescription"

const AlertDialogAction = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ className, onClick, ...props }, ref) => {
  const { setOpen } = useAlertDialog()

  return (
    <Button
      ref={ref}
      onClick={(e) => {
        onClick?.(e)
        setOpen(false)
      }}
      className={className}
      {...props}
    />
  )
})
AlertDialogAction.displayName = "AlertDialogAction"

const AlertDialogCancel = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ className, onClick, ...props }, ref) => {
  const { setOpen } = useAlertDialog()

  return (
    <Button
      ref={ref}
      variant="outline"
      onClick={(e) => {
        onClick?.(e)
        setOpen(false)
      }}
      className={className}
      {...props}
    />
  )
})
AlertDialogCancel.displayName = "AlertDialogCancel"

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}
