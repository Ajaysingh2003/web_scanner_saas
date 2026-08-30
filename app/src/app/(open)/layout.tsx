import Navbar from '@/base-component/NavBar'
import React from 'react'
function layout({children}:{children:React.ReactNode}) {
  return <div>
    <Navbar/>
    {children}
  </div>
}

export default layout
