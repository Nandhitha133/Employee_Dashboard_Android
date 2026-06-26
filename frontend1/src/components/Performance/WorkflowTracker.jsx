import React from 'react';
import { 
  User, 
  Users, 
  FileText, 
  Award, 
  Send,
  Check,
  ChevronRight
} from 'lucide-react';

const WorkflowTracker = ({ currentStageId, userFlow }) => {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    // Trigger animation after mount
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (!userFlow || userFlow.length === 0) return null;

  // Find index of current stage to determine status of other stages
  const currentIndex = userFlow.findIndex(step => step.id === currentStageId);
  
  // Helper to get icon based on stage ID
  const getIcon = (id) => {
    switch(id) {
      case 'appraisee': return User;
      case 'appraiser': return Users;
      case 'reviewer': return FileText;
      case 'director': return Award;
      case 'release': return Send;
      default: return User;
    }
  };

  return (
    <div className="w-full py-10 px-4">
      {/* Container */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center w-full relative space-y-8 md:space-y-0">
        
        {/* Desktop Connecting Line Background */}
        <div className="hidden md:block absolute left-0 top-[60px] transform -translate-y-1/2 w-full h-1 bg-gray-200 -z-20" />

        {userFlow.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isUpcoming = index > currentIndex;
          const StageIcon = getIcon(step.id);
          
          // Animation Delays
          const stepAppearDelay = index * 600; // 300ms step + 300ms line
          const lineFillDelay = stepAppearDelay + 300;

          // Status Label Logic
          let statusText = '';
          if (isCompleted || (isCurrent && index === userFlow.length - 1)) statusText = 'Completed';
          else if (isCurrent) statusText = 'In Progress';
          else statusText = 'Pending';
          
          const isFinished = isCompleted || (isCurrent && index === userFlow.length - 1);
          
          return (
            <div key={step.id} className="relative flex flex-row md:flex-col items-center w-full md:w-1/5 z-10">
              
              {/* Desktop Arrow Connector (between steps) */}
              {index < userFlow.length - 1 && (
                <div className="hidden md:block absolute top-[60px] left-1/2 w-full h-1 -z-10">
                   {/* Background Line */}
                   <div className="absolute inset-0 bg-gray-200 h-full w-full"></div>
                   
                   {/* Animated Progress Line */}
                   <div 
                     className={`absolute inset-0 h-full bg-green-500 transition-all duration-500 ease-linear origin-left
                       ${isFinished && mounted ? 'w-full' : 'w-0'}
                     `}
                     style={{ transitionDelay: `${lineFillDelay}ms` }}
                   ></div>

                   {/* Arrow Head */}
                    <div 
                      className={`absolute right-0 -top-1.5 transition-colors duration-300 ${isFinished && mounted ? 'text-green-500' : 'text-gray-200'}`}
                     style={{ transitionDelay: `${lineFillDelay + 200}ms` }}
                   >
                     <ChevronRight size={16} fill="currentColor" />
                   </div>
                </div>
              )}

              {/* Date Box (Top) */}
              <div className="mb-4 hidden md:block">
                 <div
                   className={`
                     px-3 py-1 rounded shadow-sm text-xs font-bold whitespace-nowrap border transition-all duration-500
                     ${isFinished && mounted ? 'bg-green-50 border-green-200 text-green-700' :
                       isCurrent && mounted ? 'bg-blue-50 border-blue-400 text-blue-700 transform scale-105 shadow-md' :
                       'bg-white border-gray-200 text-gray-500'}
                   `}
                   style={{ transitionDelay: `${stepAppearDelay}ms` }}
                 >
                   {step.date || 'TBD'}
                 </div>
              </div>

              {/* Main Step Circle */}
              <div className="flex flex-col items-center w-full group">
                <div 
                  className={`
                    relative flex items-center justify-center w-16 h-16 rounded-full border-4 shadow-md transition-all duration-500 z-20
                    ${isFinished && mounted
                      ? 'bg-green-100 border-green-500 text-green-600' 
                      : isCurrent && mounted
                        ? 'bg-white border-[#262760] text-[#262760] scale-125 shadow-lg ring-4 ring-blue-100' 
                        : 'bg-gray-50 border-gray-300 text-gray-400'
                    }
                  `}
                  style={{ transitionDelay: `${stepAppearDelay}ms` }}
                >
                  {/* Pulse Effect for In Progress Stage (not the final one) */}
                  {isCurrent && !isFinished && mounted && (
                    <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-20 animate-ping"></span>
                  )}
                  
                  {isFinished && mounted ? (
                    <Check size={28} strokeWidth={3} className="transition-transform duration-300 transform scale-100 text-green-600" />
                  ) : (
                    <StageIcon size={isCurrent ? 28 : 24} className={`transition-all duration-300 ${isCurrent && mounted ? 'animate-pulse' : ''}`} />
                  )}
                </div>

                {/* Mobile View: Date & Label */}
                <div className="ml-4 md:ml-0 md:mt-6 w-full md:text-center transition-all duration-500">
                  <div className="md:hidden text-xs font-bold text-gray-500 mb-1">{step.date}</div>
                  <div 
                    className={`text-lg font-bold transition-all duration-500
                      ${isFinished && mounted ? 'text-green-700' : ''}
                      ${isCurrent && mounted ? 'text-[#262760] scale-110' : ''}
                      ${isUpcoming ? 'text-gray-400' : ''}
                    `}
                    style={{ transitionDelay: `${stepAppearDelay}ms` }}
                  >
                    {step.label}
                  </div>
                  
                  {/* Description */}
                  <div 
                    className={`text-xs mt-1 md:max-w-[140px] md:mx-auto font-medium transition-colors duration-500 ${isCurrent && mounted ? 'text-blue-600 font-bold' : 'text-gray-500'}`}
                    style={{ transitionDelay: `${stepAppearDelay}ms` }}
                  >
                    {step.description}
                  </div>
                  
                  {/* Status Text for clarity */}
                  <div 
                    className={`
                      mt-2 text-xs font-bold uppercase tracking-wider transition-colors duration-500
                      ${isFinished && mounted ? 'text-green-600' : ''}
                      ${isCurrent && mounted ? 'text-blue-600 animate-pulse' : ''}
                      ${isUpcoming ? 'text-gray-300' : ''}
                    `}
                    style={{ transitionDelay: `${stepAppearDelay}ms` }}
                  >
                    {statusText}
                  </div>
                </div>
              </div>

              {/* Mobile Connector Line (Vertical) */}
              {index !== userFlow.length - 1 && (
                <div className="md:hidden absolute left-8 top-16 bottom-[-32px] w-1 -z-10">
                   <div className="absolute inset-0 bg-gray-200 w-full h-full"></div>
                   <div 
                      className={`absolute inset-0 w-full bg-green-500 transition-all duration-500 ease-linear origin-top
                        ${isFinished && mounted ? 'h-full' : 'h-0'}
                      `}
                      style={{ transitionDelay: `${lineFillDelay}ms` }}
                    ></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WorkflowTracker;
