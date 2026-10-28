'use client';

import React, { useState, useRef, useEffect, useCallback, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { 
  MoreVertical, Eye, Printer, Edit2, Trash2, CheckCircle2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface TableRowActionMenuProps {
  onView?: () => void;
  onPrint?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onApprove?: () => void;
  isPending?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  align?: 'left' | 'right';
}

const emptySubscribe = () => () => {};

export const TableRowActionMenu: React.FC<TableRowActionMenuProps> = ({
  onView,
  onPrint,
  onEdit,
  onDelete,
  onApprove,
  isPending = false,
  canEdit = true,
  canDelete = true,
  align = 'right'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const [menuPosition, setMenuPosition] = useState<{ top: number; left?: number; right?: number }>({ top: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuHeight = 220; // approximate max dropdown height
    const spaceBelow = window.innerHeight - rect.bottom;
    
    // If not enough space below, place above button
    let top = rect.bottom + 4;
    if (spaceBelow < menuHeight && rect.top > menuHeight) {
      top = rect.top - menuHeight - 4;
    }

    if (align === 'right') {
      const right = window.innerWidth - rect.right;
      setMenuPosition({ top, right });
    } else {
      const left = rect.left;
      setMenuPosition({ top, left });
    }
  }, [align]);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleClickOutside = (event: MouseEvent) => {
        if (
          menuRef.current && !menuRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
        }
      };

      const handleScrollOrResize = () => {
        setIsOpen(false);
      };

      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('scroll', handleScrollOrResize, true);
        window.removeEventListener('resize', handleScrollOrResize);
      };
    }
  }, [isOpen, updatePosition]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen(prev => !prev);
  };

  return (
    <div className="relative inline-block text-left" onClick={e => e.stopPropagation()}>
      <div className="flex items-center gap-1">
        {/* Quick Approve Button if Pending */}
        {isPending && onApprove && (
          <Button
            size="icon"
            variant="ghost"
            title="অনুমোদন করুন (Approve)"
            onClick={(e) => {
              e.stopPropagation();
              onApprove();
            }}
            className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md cursor-pointer transition-colors shadow-2xs"
          >
            <CheckCircle2 className="w-4 h-4" />
          </Button>
        )}

        {/* 3-Dot Trigger Button */}
        <Button
          ref={buttonRef}
          size="icon"
          variant="ghost"
          onClick={handleToggle}
          className={cn(
            "h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md cursor-pointer transition-colors",
            isOpen && "bg-slate-100 text-slate-900 shadow-2xs"
          )}
          title="মেনু অপশন"
        >
          <MoreVertical className="w-4 h-4" />
        </Button>
      </div>

      {/* Dropdown Menu Modal Portaled into document.body to avoid parent frame overflow clipping */}
      {isClient && isOpen && createPortal(
        <div 
          ref={menuRef}
          style={{
            position: 'fixed',
            top: `${menuPosition.top}px`,
            left: menuPosition.left !== undefined ? `${menuPosition.left}px` : undefined,
            right: menuPosition.right !== undefined ? `${menuPosition.right}px` : undefined,
            zIndex: 99999
          }}
          className="w-48 rounded-xl bg-white border border-slate-200 shadow-2xl py-1.5 font-bengali text-xs animate-in fade-in-0 zoom-in-95 duration-100 select-none ring-1 ring-black/5"
          onClick={e => e.stopPropagation()}
        >
          {isPending && onApprove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                onApprove();
              }}
              className="w-full text-left px-3.5 py-2 text-emerald-700 hover:bg-emerald-50 flex items-center gap-2.5 font-bold transition-colors border-b border-slate-100 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>অনুমোদন করুন (Approve)</span>
            </button>
          )}

          {onView && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                onView();
              }}
              className="w-full text-left px-3.5 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 font-bold transition-colors cursor-pointer"
            >
              <Eye className="w-4 h-4 text-indigo-600" />
              <span>বিস্তারিত দেখুন</span>
            </button>
          )}

          {onPrint && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                onPrint();
              }}
              className="w-full text-left px-3.5 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 font-bold transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-blue-600" />
              <span>মেমো প্রিন্ট করুন</span>
            </button>
          )}

          {onEdit && canEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                onEdit();
              }}
              className="w-full text-left px-3.5 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 font-bold transition-colors cursor-pointer"
            >
              <Edit2 className="w-4 h-4 text-amber-600" />
              <span>সম্পাদনা করুন</span>
            </button>
          )}

          {onDelete && canDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                onDelete();
              }}
              className="w-full text-left px-3.5 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 font-bold transition-colors border-t border-slate-100 cursor-pointer"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>মুছে ফেলুন</span>
            </button>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};
