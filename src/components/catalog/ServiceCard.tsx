import React from 'react';
import { Scissors, Clock, Tag, Edit2, Trash2, Users, Lock } from 'lucide-react';
import { DbProduct, DbWorkerProfile } from '../../database/db';

interface ServiceCardProps {
  service: DbProduct;
  canEditPrice: boolean;
  workerProfiles: DbWorkerProfile[];
  onOpenPriceModal: (service: DbProduct) => void;
  onEditOpen: (service: DbProduct) => void;
  onDeleteService: (id: string, name: string) => void;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({
  service,
  canEditPrice,
  workerProfiles,
  onOpenPriceModal,
  onEditOpen,
  onDeleteService,
}) => {
  const isActive = service.isActive !== false;

  return (
    <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-850 flex flex-col justify-between space-y-3.5 transition-all shadow-xs hover:shadow-md">
      {/* Header: Service Label, Name, Status & Category */}
      <div className="flex justify-between items-start gap-2">
        <div className="space-y-1">
          <span className="text-[9px] font-bold tracking-widest uppercase text-slate-400 flex items-center gap-1">
            <span className="text-purple-600 dark:text-purple-400 font-black flex items-center gap-1">
              <Scissors size={10} /> SERVICE
            </span>
          </span>
          <h4 className="text-sm font-black text-slate-800 dark:text-white leading-tight">
            {service.name}
          </h4>
        </div>

        <div className="text-right shrink-0 space-y-1">
          {isActive ? (
            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900/30">
              Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
              Inactive
            </span>
          )}
          <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">{service.category}</span>
        </div>
      </div>

      {/* Service Metrics Box */}
      <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-850/60 space-y-2">
        <div className="grid grid-cols-2 gap-2 divide-x divide-slate-150 dark:divide-slate-850">
          <div>
            <span className="text-[8px] font-extrabold uppercase text-slate-400 block tracking-wider">Est. Duration</span>
            <strong className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1 mt-0.5">
              <Clock size={11} className="text-purple-500" />
              {service.durationMinutes || 30} mins
            </strong>
          </div>
          <div className="pl-2.5 flex flex-col justify-between">
            <div>
              <span className="text-[8px] font-extrabold uppercase text-slate-400 block tracking-wider">Service Fee</span>
              <strong className="text-xs font-black text-indigo-600 dark:text-indigo-400 block mt-0.5">
                ₹{service.sellingPrice.toFixed(2)}
              </strong>
            </div>
            {canEditPrice ? (
              <button
                onClick={() => onOpenPriceModal(service)}
                className="mt-1 text-[9px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                title="Edit service fee"
              >
                <Tag size={9} /> Edit Fee
              </button>
            ) : (
              <span className="mt-1 text-[9px] text-slate-400 font-medium flex items-center gap-0.5" title="Price edit restricted">
                <Lock size={9} /> Locked
              </span>
            )}
          </div>
        </div>

        {/* Assigned Staff */}
        {workerProfiles.length > 0 && service.assignedWorkerIds && service.assignedWorkerIds.length > 0 && (
          <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center gap-1 text-[10px] text-slate-500">
            <Users size={11} className="text-slate-400" />
            <span className="font-semibold text-slate-600 dark:text-slate-300">
              Staff: {service.assignedWorkerIds.map(id => workerProfiles.find(w => w.id === id)?.name).filter(Boolean).join(', ')}
            </span>
          </div>
        )}
      </div>

      {service.description && (
        <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">
          {service.description}
        </p>
      )}

      {/* Action Controls */}
      <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-850/60 gap-2">
        <div className="text-[10px] text-slate-400 font-semibold italic flex items-center gap-1">
          <Tag size={11} /> Service Offering
        </div>

        <div className="flex gap-1 items-center">
          {canEditPrice && (
            <button
              onClick={() => onOpenPriceModal(service)}
              className="w-8 h-8 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-slate-200 dark:border-slate-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center cursor-pointer"
              title="Edit Fee"
            >
              <Tag size={12} />
            </button>
          )}

          <button
            onClick={() => onEditOpen(service)}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-850 dark:hover:text-slate-100 flex items-center justify-center cursor-pointer"
            title="Edit Service"
          >
            <Edit2 size={12} />
          </button>

          <button
            onClick={() => onDeleteService(service.id, service.name)}
            className="w-8 h-8 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-slate-200 dark:border-slate-800 text-rose-500 hover:text-rose-600 flex items-center justify-center cursor-pointer"
            title="Delete Service"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};
