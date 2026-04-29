import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  /** "success": borde discreto + icono verde, sin tinte de fondo */
  variant?: "default" | "success";
};

export function ActionFeedbackDialog({ open, onOpenChange, title, message, variant = "default" }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          variant === "success" &&
            "border-emerald-500/25 bg-background shadow-md dark:border-emerald-500/20"
        )}
      >
        <DialogHeader>
          <DialogTitle
            className={cn(
              "flex items-center gap-2.5 text-balance",
              variant === "success" && "pr-6"
            )}
          >
            {variant === "success" ? (
              <CheckCircle2
                className="size-[1.35rem] shrink-0 text-emerald-600 dark:text-emerald-400"
                aria-hidden
              />
            ) : null}
            {title}
          </DialogTitle>
          <DialogDescription className="text-pretty">{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
            Entendido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
