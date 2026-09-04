import Navbar from '@/base-component/NavBar'
import { AnimatedFooter } from '@/components/ui/animated-footer'
import React from 'react'
function layout({children}:{children:React.ReactNode}) {
  return <div>
    <Navbar/>
    {children}
    <AnimatedFooter/>
  </div>
}

export default layout
