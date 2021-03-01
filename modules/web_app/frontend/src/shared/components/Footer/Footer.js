import React, { Component } from "react";
import { FaFacebook, FaTwitter } from "react-icons/fa";
import "./Footer.css";

class Footer extends Component {
  render() {
    const aboutItems = [
      { label: "Quá trình hình thành", link: "about/dev-progress" },
      { label: "Thành viên nhóm", link: "about/members" },
      { label: "Làm việc tại topDup", link: "about/work-opportunities" },
      { label: "Ra mắt topDup", link: "about/release" },
    ];

    const contactItems = [
      { label: "Điện thoại", link: "contact/phone" },
      { label: "Email", link: "about/email" },
    ];

    return (
      <footer className="footer">
        <div className="container">
          <div className="layout-grid">
            <div className="col-sm">
              <div className="layout-grid margin-bottom--xs">
                <span className="topdup-label">topDup</span>
              </div>
              <div className="layout-grid margin-bottom--xs">Mang đén một cộng đồng sáng tạo và đầy nhiệt huyết</div>
              <div className="layout-grid">
                <div className="layout-cell">
                  <a href="contact/facebook" className="footer-link">
                    <FaFacebook />
                  </a>
                </div>
                <div className="layout-cell">
                  <a href="contact/twitter" className="footer-link">
                    <FaTwitter />
                  </a>
                </div>
              </div>
            </div>
            <div className="col-sm">
              <div className="layout-grid">
                <span>Về topDup</span>
              </div>
              {aboutItems.map((item) => (
                <div className="layout-grid">
                  <a className="footer-link" href={item.link}>
                    {item.label}
                  </a>
                </div>
              ))}
            </div>
            <div className="col-sm">
              <div className="layout-grid">
                <span>Liên lạc</span>
              </div>
              {contactItems.map((item) => (
                <div className="layout-grid">
                  <a className="footer-link" href={item.link}>
                    {item.label}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="container">
          <hr style={{ height: "1px", backgroundColor: "white", margin: "20px 0px" }} />
        </div>
        <div className="container layout-grid">
          <div>@topDup, 2021.</div>
          <div className="flex-fill"></div>
          <div className="layout-cell" style={{ marginRight: "10px" }}>
            <a href="privacy-policy" className="footer-link">
              Chính sách bảo mật
            </a>
          </div>
          <div className="layout-cell">
            <a href="terms-conditions" className="footer-link">
              Điều khoản
            </a>
          </div>
        </div>
      </footer>
    );
  }
}

export default Footer;
