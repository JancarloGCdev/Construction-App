import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CalculatorQuickNavLinks } from "@/components/calculators/calculator-quick-nav-links";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  confirmOpen: boolean;
  onConfirmOpenChange: (open: boolean) => void;
  onConfirmAdd: () => void;
  successOpen: boolean;
  onSuccessOpenChange: (open: boolean) => void;
  /** Texto bajo el título al confirmar (opcional) */
  confirmHint?: string;
  /** Descripción al confirmar; por defecto mensaje genérico */
  confirmDescription?: string;
};

const defaultConfirm =
  "Se agregará una línea al carrito de cotización. Podrás sumar otras calculadoras antes de generar el PDF o WhatsApp.";

export function AddToQuoteModalFlow({
  confirmOpen,
  onConfirmOpenChange,
  onConfirmAdd,
  successOpen,
  onSuccessOpenChange,
  confirmHint,
  confirmDescription = defaultConfirm,
}: Props) {
  return (
    <>
      <AlertDialog open={confirmOpen} onOpenChange={onConfirmOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Añadir a la cotización?</AlertDialogTitle>
            {confirmHint ? (
              <p className="text-sm text-foreground/90 font-medium">{confirmHint}</p>
            ) : null}
            <AlertDialogDescription className="text-pretty">{confirmDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onConfirmAdd();
                onConfirmOpenChange(false);
              }}
            >
              Sí, añadir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={successOpen} onOpenChange={onSuccessOpenChange}>
        <DialogContent className="gap-0 p-0 sm:max-w-md">
          <div className="max-h-[min(70vh,28rem)] overflow-y-auto px-6 pb-2 pt-14 pr-12">
            <DialogHeader className="text-left">
              <DialogTitle>Añadido al carrito</DialogTitle>
              <DialogDescription>
                Puedes seguir sumando más partidas desde otra calculadora o abrir la cotización para
                completar datos del cliente y el desglose.
              </DialogDescription>
            </DialogHeader>
            <CalculatorQuickNavLinks className="mt-4" />
          </div>
          <DialogFooter className="gap-2 sm:gap-3 border-t border-border px-6 py-4">
            <Button type="button" variant="secondary" onClick={() => onSuccessOpenChange(false)}>
              Seguir aquí
            </Button>
            <Button asChild>
              <Link href="/quote" onClick={() => onSuccessOpenChange(false)}>
                Ir a cotización
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
