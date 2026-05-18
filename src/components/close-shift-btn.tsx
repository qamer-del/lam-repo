'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/providers/language-provider'
import { ShiftClosingWorkflow } from './shift-closing-workflow'
import { cn } from '@/lib/utils'
import { History } from 'lucide-react'

export function CloseShiftBtn({ 
  triggerClassName,
  triggerIcon,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: { 
  triggerClassName?: string 
  triggerIcon?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const { t } = useLanguage()
  const [internalOpen, setInternalOpen] = useState(false)

  // Support both controlled (from parent) and uncontrolled mode
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setIsOpen = controlledOnOpenChange !== undefined ? controlledOnOpenChange : setInternalOpen

  return (
    <>
      <Button 
        variant="ghost"
        className={cn(triggerClassName, "gap-2 transition-all active:scale-95")} 
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setIsOpen(true)
        }}
      >
        {triggerIcon || <History size={14} />}
        <span className={triggerIcon ? "" : ""}>{t('closeMyShift')}</span>
      </Button>

      <ShiftClosingWorkflow 
        open={isOpen} 
        onOpenChange={setIsOpen} 
      />
    </>
  )
}
