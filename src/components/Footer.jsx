export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-section">
          <h4>Smart Amrita Hackathon 2026</h4>
          <p>
            An internal hackathon by Amrita Vishwa Vidyapeetham, Chennai Campus
            to prepare teams for the Smart India Hackathon 2026.
          </p>
          <p style={{ marginTop: '12px', fontSize: '0.8rem', opacity: 0.7 }}>
            Innovating India, Solving National Challenges
          </p>
        </div>

        <div className="footer-section">
          <h4>Important Dates</h4>
          <p> PS Release: <strong>21st – 25th Aug 2026</strong></p>
          <p> Team Registration: <strong>27th Aug – 5th Sept 2026</strong></p>
          <p> Internal Hackathon: <strong>11th – 12th Sept 2026</strong></p>
          <p> Mentorship Bootcamp: <strong>16th – 23rd Sept 2026</strong></p>
          <p> SIH Portal Submission: <strong>By 24th Sept 2026</strong></p>
        </div>

        <div className="footer-section">
          <h4>Quick Links</h4>
          <p><a href="https://sih.gov.in"target="_blank"rel="noreferrer">Official SIH Portal →</a></p>
          <p><a href="https://www.amrita.edu/campus/chennai/"target="_blank"rel="noreferrer">Amrita Chennai Campus →</a></p>
          <p><a href="/problem-statements">Browse Problem Statements →</a></p>
          <p><a href="/marketplace">Team Recruitment Marketplace →</a></p>
        </div>

        <div className="footer-section">
          <h4>Contact</h4>
          <p>Amrita Vishwa Vidyapeetham</p>
          <p>Chennai Campus, Vengal Village</p>
          <p>Thiruvallur District, Tamil Nadu</p>
          <p style={{ marginTop: '8px' }}>
             sah2026@ch.amrita.edu
          </p>
        </div>
      </div>

      <div className="footer-bottom">
         2026 Smart Amrita Hackathon — Amrita Vishwa Vidyapeetham, Chennai Campus. All rights reserved.
      </div>
    </footer>
  );
}
