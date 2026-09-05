import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Admin from './pages/Admin'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<Admin />} />
        {/* 链接/文章详情统一由首页内嵌子页渲染，保证点击卡片与刷新显示一致 */}
        <Route path="/link/:linkId" element={<Home />} />
        <Route path="/post/:postId" element={<Home />} />
      </Routes>
    </Router>
  )
}

export default App
