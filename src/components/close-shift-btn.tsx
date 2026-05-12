'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/providers/language-provider'
import { ShiftClosingWorkflow } from './shift-closing-workflow'
import { cn } from '@/lib/utils'
import { History } from 'lucide-react'

export function CloseShiftBtn({ 
  triggerClassName,
  triggerIcon
}: { 
  triggerClassName?: string 
  triggerIcon?: React.ReactNode
}) {
  const { t } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button 
        variant="outline" 
        className={cn("h-9 px-4 text-sm gap-2 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400 font-bold shadow-sm transition-all active:scale-95", triggerClassName)} 
        onClick={() => setIsOpen(true)}
      >
        {triggerIcon || <History size={14} />}
        <span className={triggerIcon ? "hidden sm:inline" : ""}>{t('closeMyShift')}</span>
      </Button>

      <ShiftClosingWorkflow 
        open={isOpen} 
        onOpenChange={setIsOpen} 
      />
    </>
  )
}
