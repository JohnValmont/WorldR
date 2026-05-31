'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { livingWorldTheme as theme } from '../../../styles/livingWorldTheme';
import CitizenFileProgress from '../../../components/citizen-file/CitizenFileProgress';
import CitizenFileChoices from '../../../components/citizen-file/CitizenFileChoices';
import CitizenFileLivePreview from '../../../components/citizen-file/CitizenFileLivePreview';

export default function CitizenFilePage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  
  // Overall state for citizen file choices
  const [formData, setFormData] = useState({
    name: '',
    homeState: '',
    householdBackground: '',
    pre18Reputation: '',
    firstSupporter: '',
    earlyBurden: '',
  });

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 6;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const granted = localStorage.getItem('worldr_pre_alpha_access_granted_v1') === 'true';
      const hasMotherland = !!localStorage.getItem('worldr_selected_motherland');
      
      if (granted && hasMotherland) {
        setAuthorized(true);
        // If there's already an old name, auto-fill it
        const oldName = localStorage.getItem('worldr_character_v2');
        if (oldName) {
          try {
            const parsed = JSON.parse(oldName);
            if (parsed.name) {
              setFormData(prev => ({ ...prev, name: parsed.name }));
            }
          } catch (e) {}
        }
      } else {
        router.replace(granted ? '/world-entry' : '/pre-alpha-access');
      }
    }
  }, [router]);

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#07100D]">
        <div className="w-6 h-6 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
      </div>
    );
  }

  const handleNext = () => {
    if (currentStep < totalSteps) setCurrentStep(currentStep + 1);
  };
  
  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleUpdate = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div 
      className="min-h-screen w-full relative overflow-x-hidden"
      style={{
        backgroundColor: '#07100D',
        backgroundImage: 'radial-gradient(circle at 50% -20%, rgba(35, 60, 48, 0.4) 0%, rgba(7, 16, 13, 0) 50%)',
      }}
    >
      <div className="max-w-[1480px] mx-auto p-4 sm:p-7 z-10 relative">
        
        {/* Header */}
        <div className="mb-8">
          <h1 
            className="text-2xl font-bold tracking-tight mb-2"
            style={{ color: theme.colors.text.textPrimary }}
          >
            Citizen File Creation
          </h1>
          <p 
            className="text-sm max-w-2xl leading-relaxed"
            style={{ color: theme.colors.text.textSecondary }}
          >
            Before age 18, your life was shaped by family, place, reputation, supporters, and burdens. These choices form your starting power in WORLDr.
          </p>
        </div>

        <div className="flex flex-col lg:grid lg:grid-cols-[330px_minmax(0,1fr)_360px] gap-[22px]">
          
          {/* Left Column - Progress Timeline */}
          <div className="w-full">
            <CitizenFileProgress currentStep={currentStep} formData={formData} />
          </div>

          {/* Center Column - Choice Panel */}
          <div className="w-full">
            <CitizenFileChoices 
              currentStep={currentStep} 
              formData={formData} 
              onUpdate={handleUpdate}
              onNext={handleNext}
              onPrev={handlePrev}
            />
          </div>

          {/* Right Column - Live Preview */}
          <div className="w-full">
            <CitizenFileLivePreview formData={formData} />
          </div>

        </div>
      </div>
    </div>
  );
}
