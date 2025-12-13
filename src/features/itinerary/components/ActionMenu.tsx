import { Fragment, useRef } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { MoreVertical, Download, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { exportTripTemplate, importItinerary } from '../utils/importExport';
import { toast } from 'sonner';

interface ActionMenuProps {
    tripId: string;
    tripName: string;
    tripDates: { date: string; label: string }[];
    startDate: string;
    onImportSuccess: () => void;
}

export default function ActionMenu({ tripId, tripName, tripDates, startDate, onImportSuccess }: ActionMenuProps) {
    const { t } = useTranslation();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleExport = () => {
        exportTripTemplate(tripName, tripDates);
        toast.success(t('itinerary.exportSuccess', 'Template downloaded!'));
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const toastId = toast.loading(t('itinerary.importing', 'Importing itinerary...'));

        try {
            await importItinerary(tripId, startDate, file);
            toast.success(t('itinerary.importSuccess', 'Itinerary imported successfully!'), { id: toastId });
            onImportSuccess();
            // Reset input
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (error: any) {
            console.error('Import failed:', error);
            toast.error(`${t('itinerary.importError', 'Import failed')}: ${error.message}`, { id: toastId });
        }
    };

    return (
        <div className="relative z-50">
            <Menu as="div" className="relative inline-block text-left">
                <div>
                    <Menu.Button className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors">
                        <MoreVertical className="w-5 h-5" />
                    </Menu.Button>
                </div>
                <Transition
                    as={Fragment}
                    enter="transition ease-out duration-100"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                >
                    <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right divide-y divide-gray-100 rounded-xl bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none overflow-hidden">
                        <div className="px-1 py-1">
                            <Menu.Item>
                                {({ active }: { active: boolean }) => (
                                    <button
                                        onClick={handleExport}
                                        className={`${active ? 'bg-orange-50 text-orange-600' : 'text-gray-900'
                                            } group flex w-full items-center rounded-lg px-2 py-2 text-sm`}
                                    >
                                        <Download className="mr-2 h-4 w-4" />
                                        {t('itinerary.exportTemplate', 'Export Template')}
                                    </button>
                                )}
                            </Menu.Item>
                            <Menu.Item>
                                {({ active }: { active: boolean }) => (
                                    <button
                                        onClick={handleImportClick}
                                        className={`${active ? 'bg-orange-50 text-orange-600' : 'text-gray-900'
                                            } group flex w-full items-center rounded-lg px-2 py-2 text-sm`}
                                    >
                                        <Upload className="mr-2 h-4 w-4" />
                                        {t('itinerary.importItinerary', 'Import Itinerary (JSON)')}
                                    </button>
                                )}
                            </Menu.Item>
                        </div>
                    </Menu.Items>
                </Transition>
            </Menu>

            {/* Hidden File Input */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".json"
                onChange={handleFileChange}
            />
        </div>
    );
}
