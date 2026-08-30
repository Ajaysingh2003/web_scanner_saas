import InteractiveAuthScreen from '@/modules/micro-interactions/Authanimation'
import Authanimation from '@/modules/micro-interactions/Authanimation'
import React from 'react'

function layout({children}: {children: React.ReactNode}) {
  return (
    <div className='grid bg-[#fafaf9] grid-cols-1 md:grid-cols-12  '>
        <div className='col-span-12 md:col-span-6'>
            <InteractiveAuthScreen/>
        </div>
        <div className='col-span-12  p-3 md:col-span-6 rounded-lg  overflow-hidden'>
          <div className='bg-white rounded-xl shadow '>
          {children}
          </div>
        </div>
        
    </div>
  )
}

export default layout