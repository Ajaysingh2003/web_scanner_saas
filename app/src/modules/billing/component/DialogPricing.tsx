import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import PricingTable from './PricingTable'

function DialogPricing({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose()
      }}
    >
      <DialogContent className="fixed inset-x-0 bottom-0 top-auto flex h-auto max-h-[94dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-b-none rounded-t-[24px] bg-white p-0 shadow-2xl sm:inset-x-1/2 sm:top-1/2 sm:bottom-auto sm:h-auto sm:max-h-[90dvh] sm:w-[calc(100vw-2rem)] sm:max-w-[1180px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl">
       <DialogTitle className="flex flex-col items-center justify-center gap-2 px-4 pt-6 sm:px-6">
  <div className="flex w-full items-center justify-center">
    <h3 className="text-center font-heading text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl md:text-4xl">
      Comprehensive security audits <br />
      for your web assets,{" "}
      <span className="italic font-bold bg-gradient-to-r from-rose-600 via-rose-500 to-pink-500 bg-clip-text text-transparent">
        at any scale
      </span>
    </h3>
  </div>
</DialogTitle>
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-7 sm:py-6">
          <PricingTable />
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default DialogPricing
