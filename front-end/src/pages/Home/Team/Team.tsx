import React from 'react'
import { Swiper, SwiperSlide } from "swiper/react";
import {
  Navigation,
  Pagination,
  Autoplay,
  A11y,
  EffectCoverflow,
} from "swiper/modules";

// Import Swiper styles
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/effect-coverflow";


import "./TeamStyle.css"

function Team() {
  return (
    <section id="team" className="teams">
      <div className="container">
        <Swiper
          modules={[Navigation, Pagination, Autoplay, A11y, EffectCoverflow]}
          spaceBetween={20}
          slidesPerView={3}
          pagination={{ clickable: true }}
          scrollbar={{ draggable: true }}
          loop={true}
          autoplay={{ delay: 3000, disableOnInteraction: false }}
          className="mySwiper"
          effect="coverflow"
          coverflowEffect={{
            rotate: 50,
            stretch: 0,
            depth: 100,
            modifier: 1,
            slideShadows: true,
          }}
          breakpoints={{
            0: {
              slidesPerView: 1,
              spaceBetween: 10,
            },
            768: {
              slidesPerView: 3,
              spaceBetween: 10,
            },
          }}
        >
          <SwiperSlide className="member-card">
            <div className="member-card-header">
              <div className="member-img">
                <img
                  src="/images/team/oualid-oulmyr.jpeg"
                  alt="image profile"
                />
              </div>
            </div>
            <div className="member-card-body">
              <div className="member-fullname">Oulmyr Oualid</div>
              <div className="member-username">ooulmyr</div>
              <div className="member-mission">Frontend Developer</div>
            </div>
            <div className="member-card-footer">
              <div className="member-social-media">
                <a href="#">
                  <i className="fa-brands fa-linkedin-in"></i>
                </a>
                <a href="#">
                  <i className="fa-brands fa-github"></i>{" "}
                </a>
                <a href="#">
                </a>
              </div>
            </div>
          </SwiperSlide>
          <SwiperSlide className="member-card">
            <div className="member-card-header">
              <div className="member-img">
                <img src="/images/team/hajar-charef.jpeg" alt="image profile" />
              </div>
            </div>
            <div className="member-card-body">
              <div className="member-fullname">Hajar Charef</div>
              <div className="member-username">hcharef</div>
              <div className="member-mission">Game Developer</div>
            </div>
            <div className="member-card-footer">
              <div className="member-social-media">
                <a href="#">
                  <i className="fa-brands fa-linkedin-in"></i>
                </a>
                <a href="#">
                  <i className="fa-brands fa-github"></i>{" "}
                </a>
                <a href="#">
                </a>
              </div>
            </div>
          </SwiperSlide>
          <SwiperSlide className="member-card">
            <div className="member-card-header">
              <div className="member-img">
                <img
                  src="/images/team/abdelmoumen-el-mahmoudy.jpeg"
                  alt="image profile"
                />
              </div>
            </div>
            <div className="member-card-body">
              <div className="member-fullname">Abdelmoumen El Mahmoudi</div>
              <div className="member-username">ael-mahm</div>
              <div className="member-mission">backend Developer</div>
            </div>
            <div className="member-card-footer">
              <div className="member-social-media">
                <a href="#">
                  <i className="fa-brands fa-linkedin-in"></i>
                </a>
                <a href="#">
                  <i className="fa-brands fa-github"></i>{" "}
                </a>
                <a href="#">
                </a>
              </div>
            </div>
          </SwiperSlide>
          <SwiperSlide className="member-card">
            <div className="member-card-header">
              <div className="member-img">
                <img
                  src="/images/team/yassine-bouali.jpeg"
                  alt="image profile"
                />
              </div>
            </div>
            <div className="member-card-body">
              <div className="member-fullname">Yassine Bouali</div>
              <div className="member-username">ybouali</div>
              <div className="member-mission">Full stack web developer</div>
            </div>
            <div className="member-card-footer">
              <div className="member-social-media">
                <a href="#">
                  <i className="fa-brands fa-linkedin-in"></i>
                </a>
                <a href="#">
                  <i className="fa-brands fa-github"></i>{" "}
                </a>
                <a href="#">
                </a>
              </div>
            </div>
          </SwiperSlide>
        </Swiper>
        <div className="swiper-button-next"></div>
        <div className="swiper-button-prev"></div>
      </div>
    </section>
  )
}

export default Team
