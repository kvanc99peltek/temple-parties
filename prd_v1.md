# Temple Party Finder - Product Requirements Document

**Version:** 1.0  
**Last Updated:** January 7, 2026  
**Product Owner:** Mr. Amir, Mr. Peltek

---

## Executive Summary

Temple Party Finder is a web application that centralizes party discovery for Temple University students. Students can browse verified party listings, view them on a map, and navigate directly via Google Maps integration.

**Target Launch:** February 2026 (8 weeks)  
**Success Metric:** 500+ weekly active users navigating to parties

---

## Problem & Solution

### Problem
- Party information scattered across YikYak, Instagram, group chats
- No quality control - fake parties and spam
- Manual address entry into Google Maps
- Hard to discover parties outside your social circle

### Solution
Single platform with verified party listings, map visualization, and one-tap navigation to Google Maps.

---

## Target Users

1. **Students (Primary):** Find legitimate parties easily, see all options, navigate seamlessly
2. **Social Chairs (Secondary):** Promote fraternity/sorority events to wider audience
3. **House Party Hosts (Tertiary):** Get visibility for their parties without spam

---

## Core Features (MVP)

### 1. Authentication
- Temple email (@temple.edu) only
- Email verification with 6-digit code
- Simple login/logout

### 2. Party Discovery Feed
- List view of approved parties for current weekend
- Filter by date (Fri/Sat/Sun) and type (frat/house/venue)
- Sort by hype score, time, or sponsored status
- Display: name, host, address, date/time, description, hype score

### 3. Interactive Map
- Full-screen map with Temple branding (cherry red)
- Party location pins
- Click pin to see details
- Toggle between list and map view

### 4. Navigation Integration
- "Navigate" button on each party
- Opens Google Maps with address
- Tracks clicks for hype score

### 5. Two-Tier Verification
- **Tier 1:** Temple-recognized organizations (auto-approve)
- **Tier 2:** House parties (manual admin review)

### 6. Party Submission
- Verified hosts can submit parties
- Form: name, address, date/time, description, type
- Address autocomplete with map preview
- Pending status until approval (except auto-approved orgs)

### 7. Post-Party Rating
- Rate 1-5 stars after attending
- Only for users who clicked "Navigate"
- Contributes to hype score

### 8. Admin Dashboard
- Review pending submissions
- Verify host accounts
- View analytics
- Remove inappropriate content

### 9. Hype Score Algorithm
- Formula: (navigation_clicks × 0.7) + (avg_rating × 20 × 0.3)
- Real-time updates

### 10. Sponsored Listings
- Mark parties as "sponsored" (badge + top placement)
- Payment processing post-MVP

---

## Tech Stack

### Frontend
- **Framework:** Next.js 14 (React + TypeScript)
- **Styling:** Tailwind CSS
- **UI Components:** Shadcn/ui
- **Map:** Mapbox GL JS

### Backend
- **Java API:** Spring Boot 3.2 (core business logic, auth, CRUD)
- **Python Services:** FastAPI (geocoding, analytics, email, hype score)
- **Database:** PostgreSQL 15
- **Email:** SendGrid

### Infrastructure
- **Frontend Hosting:** Vercel
- **Backend Hosting:** Railway or Render
- **Database Hosting:** Railway or AWS RDS
- **Containerization:** Docker

---

## Database Schema
```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'student',
  organization_name VARCHAR(255),
  verified_host BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP
);

-- Parties
CREATE TABLE parties (
  id UUID PRIMARY KEY,
  host_id UUID REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  address VARCHAR(500) NOT NULL,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  description TEXT,
  party_type VARCHAR(20) NOT NULL,
  is_sponsored BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'pending',
  hype_score DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP
);

-- Navigation Clicks
CREATE TABLE navigation_clicks (
  id UUID PRIMARY KEY,
  party_id UUID REFERENCES parties(id),
  user_id UUID REFERENCES users(id),
  clicked_at TIMESTAMP,
  UNIQUE(party_id, user_id)
);

-- Ratings
CREATE TABLE ratings (
  id UUID PRIMARY KEY,
  party_id UUID REFERENCES parties(id),
  user_id UUID REFERENCES users(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP,
  UNIQUE(party_id, user_id)
);
```

---

## API Endpoints

### Java Spring Boot (Port 8080)

**Authentication:**
- `POST /api/auth/signup`
- `POST /api/auth/verify-email`
- `POST /api/auth/login`
- `POST /api/auth/logout`

**Parties:**
- `GET /api/parties` - List approved parties
- `GET /api/parties/:id` - Get single party
- `POST /api/parties` - Create party (host only)
- `PUT /api/parties/:id` - Update party
- `DELETE /api/parties/:id` - Delete party
- `POST /api/parties/:id/navigate` - Log navigation click
- `POST /api/parties/:id/rate` - Submit rating

**Admin:**
- `GET /api/admin/parties/pending`
- `PUT /api/admin/parties/:id/approve`
- `PUT /api/admin/parties/:id/reject`
- `GET /api/admin/hosts/pending`
- `PUT /api/admin/hosts/:id/verify`

### Python FastAPI (Port 8000)

- `POST /api/geocode` - Convert address to lat/lng
- `POST /api/hype-score/calculate` - Calculate hype score
- `POST /api/email/send-verification` - Send email
- `GET /api/analytics/dashboard` - Get analytics

---

## User Flows

### Student Flow
1. Sign up with Temple email → verify code
2. Browse parties (list or map)
3. Click "Navigate" → Opens Google Maps
4. Later: rate party (1-5 stars)

### Social Chair Flow
1. Sign up → request host verification
2. Wait for admin approval
3. Submit party listing
4. Auto-approved (if recognized org) or pending review

### Admin Flow
1. Review pending parties → approve/reject
2. Verify host accounts
3. Monitor analytics

---

## Design Specs

### Colors
- **Primary:** Temple Cherry Red (#A41E35)
- **Background:** White (#FFFFFF)
- **Text:** Dark Gray (#2D2D2D)
- **Accent:** Light Gray (#F9FAFB)

### Typography
- **Font:** Inter (body), Poppins (headings)
- **Sizes:** 16px (body), 20-32px (headings)

### Components
- **Buttons:** 12px padding, 8px border radius, bold text
- **Party Cards:** 16px padding, medium shadow, 360px max width
- **Map Pins:** 32x32px cherry red circles

---

## Development Roadmap

### Week 1-2: Foundation
- Set up Spring Boot + FastAPI projects
- Configure PostgreSQL
- Build authentication system
- Deploy staging environment

### Week 3-4: Core Features
- Party CRUD operations
- Geocoding integration
- Party feed UI (list + filters)
- Admin dashboard basics

### Week 4-5: Map & Navigation
- Integrate Mapbox
- Build map view with pins
- Google Maps navigation
- Track navigation clicks

### Week 5-6: Host System
- Host verification workflow
- Party submission form
- Two-tier approval logic
- Email notifications

### Week 6-7: Rating & Polish
- Rating system
- Hype score calculation
- UI/UX refinement
- Security audit

### Week 7-8: Launch
- Testing with beta users
- Fix critical bugs
- Deploy to production
- Marketing push

---

## Success Metrics

### Primary KPIs
- **Users:** 1,000 verified students by Month 3
- **Engagement:** 60% weekly active rate during party season
- **Content:** 50+ party listings per weekend
- **Navigation:** 70%+ of users navigate to at least 1 party

### Secondary Metrics
- Average party rating > 3.5 stars
- <5% fake party reports
- Page load time < 2 seconds
- 99.5% uptime during peak hours (Fri-Sun 6pm-2am)

---

## Risks & Mitigation

1. **Low adoption:** Pre-seed 20-30 parties, partner with popular fraternities, run Instagram ads
2. **Fake submissions:** Two-tier verification, phone verification for house parties, three-strike system
3. **Safety concerns:** Clear ToS, age verification, report button, safety resources
4. **YikYak competition:** Focus on quality control, better UX, seamless navigation

---

## Out of Scope (Post-MVP)

- Push notifications
- In-app messaging/chat
- "Going" / RSVP features
- Party photo galleries
- Native mobile apps
- Payment processing
- Multi-campus expansion

---

## Launch Strategy

1. **Beta (Week 8):** 100 users, gather feedback, fix bugs
2. **Public Launch (Week 9):** Instagram/YikYak promotion, campus flyers, influencer partnerships
3. **Growth (Week 10-12):** Referral incentives, weekly recaps, local business partnerships

---

## Monetization (Post-MVP)

1. **Sponsored Listings:** $50-100 per party (Month 3+)
2. **Local Partnerships:** Affiliate commissions from pizza, bars, Uber (Month 6+)
3. **Premium Features:** $10/month for hosts (analytics, priority placement) (Month 12+)

---

**End of PRD**