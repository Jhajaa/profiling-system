import React from 'react'
import '../../../css/footer.css'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="footer">
      <span className="footer-left">College of Computing Studies</span>
      <span className="footer-center">Dangal ng Bayan</span>
      <span className="footer-right">4ITC · {year}</span>
    </footer>
  )
}