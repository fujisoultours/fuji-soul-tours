/**
 * Google Apps Script for Review System
 *
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Go to https://script.google.com and create a new project
 * 2. Paste this entire code into Code.gs
 * 3. Update SPREADSHEET_ID with your Google Sheet ID
 * 4. Create a Google Drive folder for review photos and update PHOTOS_FOLDER_ID
 * 5. Deploy → New Deployment → Web App
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 6. Copy the deployment URL and update:
 *    - REVIEW_GAS_ENDPOINT in review.html
 *    - REVIEW_GAS_ENDPOINT in reviews.js
 *
 * SPREADSHEET SETUP:
 * The script auto-creates a "Reviews" sheet with these columns:
 * Timestamp | CustomerName | Email | TourDate | Token | EmailSent | ReviewSubmitted | Stars | ReviewText | PhotoURLs | Status
 *
 * APPROVAL WORKFLOW:
 * 1. Add customer rows (name, email, tour date) manually or via the menu
 * 2. Select a row → Review System menu → Send Review Request
 * 3. Customer receives email with unique review link
 * 4. Customer submits review → sheet updates in real-time
 * 5. Admin sets Status column to "approved" to display on site
 */

const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';
const SHEET_NAME = 'Reviews';
const FROM_EMAIL = 'fujisoultours@gmail.com';
const PHOTOS_FOLDER_ID = 'YOUR_FOLDER_ID_HERE'; // Google Drive folder for photos
const REVIEW_PAGE_URL = 'https://www.fujisoultours.com/review';

// ===== WEB APP HANDLERS =====

function doGet(e) {
  try {
    const action = (e.parameter && e.parameter.action) || '';

    if (action === 'validate') {
      return handleValidateToken(e.parameter.token);
    }

    if (action === 'approved') {
      return handleGetApproved();
    }

    return jsonResponse({ success: false, error: 'Unknown action' });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    if (data.action === 'submit-review') {
      return handleSubmitReview(data);
    }

    return jsonResponse({ success: false, error: 'Unknown action' });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

// ===== TOKEN VALIDATION =====

function handleValidateToken(token) {
  if (!token) return jsonResponse({ valid: false, error: 'No token provided' });

  const sheet = getOrCreateSheet();
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][4] === token) { // Token column (E)
      const submitted = data[i][6]; // ReviewSubmitted column (G)
      if (submitted === true || submitted === 'TRUE') {
        return jsonResponse({ valid: false, error: 'already_submitted' });
      }
      return jsonResponse({
        valid: true,
        customerName: data[i][1],
        tourDate: data[i][3] ? Utilities.formatDate(new Date(data[i][3]), 'Asia/Tokyo', 'yyyy-MM-dd') : ''
      });
    }
  }

  return jsonResponse({ valid: false, error: 'invalid_token' });
}

// ===== GET APPROVED REVIEWS =====

function handleGetApproved() {
  const sheet = getOrCreateSheet();
  const data = sheet.getDataRange().getValues();
  const reviews = [];

  for (let i = 1; i < data.length; i++) {
    const status = (data[i][10] || '').toString().toLowerCase(); // Status column (K)
    if (status === 'approved') {
      const stars = parseInt(data[i][7]) || 5;
      const text = (data[i][8] || '').toString();
      const author = (data[i][1] || '').toString();
      const tourDate = data[i][3];
      const photoUrls = (data[i][9] || '').toString();

      let dateStr = '';
      if (tourDate) {
        try {
          const d = new Date(tourDate);
          const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
          dateStr = months[d.getMonth()] + ' ' + d.getFullYear();
        } catch (e) {
          dateStr = tourDate.toString();
        }
      }

      reviews.push({
        stars: stars,
        text: text,
        author: author,
        date: dateStr,
        source: 'Direct',
        photos: photoUrls ? photoUrls.split(',').map(function(u) { return u.trim(); }) : []
      });
    }
  }

  return jsonResponse({ success: true, reviews: reviews });
}

// ===== SUBMIT REVIEW =====

function handleSubmitReview(data) {
  if (!data.token) return jsonResponse({ success: false, error: 'No token' });

  const sheet = getOrCreateSheet();
  const allData = sheet.getDataRange().getValues();
  let rowIndex = -1;

  for (let i = 1; i < allData.length; i++) {
    if (allData[i][4] === data.token) {
      if (allData[i][6] === true || allData[i][6] === 'TRUE') {
        return jsonResponse({ success: false, error: 'already_submitted' });
      }
      rowIndex = i + 1; // 1-based row index
      break;
    }
  }

  if (rowIndex === -1) return jsonResponse({ success: false, error: 'invalid_token' });

  // Handle photo uploads (optional)
  var photoUrls = '';
  if (data.photos && data.photos.length > 0) {
    try {
      var folder = DriveApp.getFolderById(PHOTOS_FOLDER_ID);
      var urls = [];
      for (var p = 0; p < data.photos.length && p < 3; p++) {
        var photoData = data.photos[p];
        var mimeMatch = photoData.match(/^data:(image\/\w+);base64,/);
        var mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        var base64 = mimeMatch ? photoData.replace(mimeMatch[0], '') : photoData;
        var blob = Utilities.newBlob(Utilities.base64Decode(base64), mimeType, 'review_' + data.token.substring(0, 8) + '_' + p + '.jpg');
        var file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        urls.push(file.getUrl());
      }
      photoUrls = urls.join(', ');
    } catch (e) {
      // Photo upload failed but we still save the review text
    }
  }

  // Update the row
  sheet.getRange(rowIndex, 7).setValue(true);                    // ReviewSubmitted
  sheet.getRange(rowIndex, 8).setValue(parseInt(data.stars) || 5); // Stars
  sheet.getRange(rowIndex, 9).setValue(data.text || '');           // ReviewText
  sheet.getRange(rowIndex, 10).setValue(photoUrls);                // PhotoURLs
  sheet.getRange(rowIndex, 11).setValue('pending');                // Status

  // Send notification to admin
  sendAdminNotification(allData[rowIndex - 1][1], data.stars, data.text);

  return jsonResponse({ success: true });
}

// ===== SPREADSHEET MENU =====

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Review System')
    .addItem('Send Review Request (selected row)', 'sendReviewRequest')
    .addItem('Send All Pending Requests', 'sendBulkReviewRequests')
    .addSeparator()
    .addItem('Refresh Status Formatting', 'applyStatusFormatting')
    .addToUi();
}

// ===== SEND REVIEW REQUEST =====

function sendReviewRequest() {
  var sheet = getOrCreateSheet();
  var row = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().getActiveRange().getRow();

  if (row < 2) {
    SpreadsheetApp.getUi().alert('Please select a data row (not the header).');
    return;
  }

  var data = sheet.getRange(row, 1, 1, 11).getValues()[0];
  var name = data[1];
  var email = data[2];
  var tourDate = data[3];

  if (!email) {
    SpreadsheetApp.getUi().alert('No email address in this row.');
    return;
  }

  // Generate token
  var token = Utilities.getUuid();
  sheet.getRange(row, 5).setValue(token);  // Token column

  // Send email
  sendReviewRequestEmail(name, email, tourDate, token);

  // Mark as sent
  sheet.getRange(row, 6).setValue(true);   // EmailSent column
  sheet.getRange(row, 1).setValue(new Date()); // Update timestamp

  SpreadsheetApp.getUi().alert('Review request sent to ' + email);
}

function sendBulkReviewRequests() {
  var sheet = getOrCreateSheet();
  var data = sheet.getDataRange().getValues();
  var count = 0;

  for (var i = 1; i < data.length; i++) {
    var email = data[i][2];
    var emailSent = data[i][5];
    var token = data[i][4];

    // Skip if no email, already sent, or already has token
    if (!email || emailSent === true || emailSent === 'TRUE' || token) continue;

    var name = data[i][1];
    var tourDate = data[i][3];
    var newToken = Utilities.getUuid();

    sheet.getRange(i + 1, 5).setValue(newToken);
    sendReviewRequestEmail(name, email, tourDate, newToken);
    sheet.getRange(i + 1, 6).setValue(true);
    sheet.getRange(i + 1, 1).setValue(new Date());
    count++;

    // Avoid hitting email rate limits
    if (count > 0 && count % 10 === 0) Utilities.sleep(1000);
  }

  SpreadsheetApp.getUi().alert(count + ' review request(s) sent.');
}

// ===== EMAIL TEMPLATES =====

function sendReviewRequestEmail(name, email, tourDate, token) {
  var reviewUrl = REVIEW_PAGE_URL + '?token=' + token;
  var displayName = name || 'there';
  var dateStr = '';

  if (tourDate) {
    try {
      var d = new Date(tourDate);
      dateStr = Utilities.formatDate(d, 'Asia/Tokyo', 'MMMM d, yyyy');
    } catch (e) {
      dateStr = tourDate.toString();
    }
  }

  var subject = 'How was your Mt. Fuji tour? We\'d love your feedback! — Fuji Soul Tours';

  var htmlBody = '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">'
    + '<div style="text-align: center; padding: 24px 0; border-bottom: 2px solid #0077B6;">'
    + '<h1 style="font-size: 20px; margin: 0; color: #0077B6;">Fuji Soul Tours</h1>'
    + '<p style="font-size: 13px; color: #6B6B6B; margin: 4px 0 0;">Review Your Experience</p>'
    + '</div>'
    + '<div style="padding: 28px 0;">'
    + '<p style="font-size: 16px;">Hi ' + displayName + ',</p>'
    + '<p style="font-size: 15px; line-height: 1.7;">'
    + 'Thank you for joining our Mt. Fuji tour' + (dateStr ? ' on <strong>' + dateStr + '</strong>' : '') + '! '
    + 'We hope you had an amazing experience.</p>'
    + '<p style="font-size: 15px; line-height: 1.7;">'
    + 'Your feedback means the world to us and helps future travelers discover Fuji Soul Tours. '
    + 'Would you take a moment to share your experience?</p>'
    + '<div style="text-align: center; margin: 32px 0;">'
    + '<a href="' + reviewUrl + '" style="display: inline-block; background: #0077B6; color: #fff; padding: 14px 36px; border-radius: 8px; font-size: 16px; font-weight: 600; text-decoration: none;">Write a Review</a>'
    + '</div>'
    + '<p style="font-size: 14px; line-height: 1.7; color: #6B6B6B;">'
    + 'It only takes a minute — just a star rating and a few words about your experience.</p>'
    + '<p style="font-size: 15px; margin-top: 24px;">'
    + 'Thank you!<br>'
    + '<strong>Takumu</strong> — Your Guide</p>'
    + '</div>'
    + '<div style="border-top: 1px solid #DEE8EE; padding: 16px 0; text-align: center;">'
    + '<p style="font-size: 12px; color: #6B6B6B; margin: 0;">'
    + 'Fuji Soul Tours · '
    + '<a href="mailto:fujisoultours@gmail.com" style="color: #6B6B6B;">fujisoultours@gmail.com</a> · '
    + '<a href="https://www.instagram.com/fujisoultours/" style="color: #6B6B6B;">Instagram</a></p>'
    + '</div>'
    + '</div>';

  GmailApp.sendEmail(email, subject, '', {
    htmlBody: htmlBody,
    from: FROM_EMAIL,
    name: 'Fuji Soul Tours',
    bcc: FROM_EMAIL
  });
}

function sendAdminNotification(customerName, stars, text) {
  var subject = 'New Review Submitted — ' + (customerName || 'Anonymous') + ' (' + stars + '★)';
  var body = 'A new review has been submitted!\n\n'
    + 'Customer: ' + (customerName || 'Anonymous') + '\n'
    + 'Rating: ' + stars + '/5\n'
    + 'Review: ' + (text || '(no text)') + '\n\n'
    + 'Go to your spreadsheet to approve or reject this review.';

  GmailApp.sendEmail(FROM_EMAIL, subject, body, {
    from: FROM_EMAIL,
    name: 'Review System'
  });
}

// ===== HELPERS =====

function getOrCreateSheet() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow([
      'Timestamp', 'CustomerName', 'Email', 'TourDate', 'Token',
      'EmailSent', 'ReviewSubmitted', 'Stars', 'ReviewText', 'PhotoURLs', 'Status'
    ]);
    sheet.getRange('1:1').setFontWeight('bold');
    sheet.setColumnWidth(5, 300); // Token column wider
    sheet.setColumnWidth(9, 400); // ReviewText column wider
  }
  return sheet;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function applyStatusFormatting() {
  var sheet = getOrCreateSheet();
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    var statusCell = sheet.getRange(i + 1, 11);
    var status = (data[i][10] || '').toString().toLowerCase();
    var submittedCell = sheet.getRange(i + 1, 7);
    var submitted = data[i][6];

    // Color the status cell
    if (status === 'approved') {
      statusCell.setBackground('#d4edda').setFontColor('#155724');
    } else if (status === 'rejected') {
      statusCell.setBackground('#f8d7da').setFontColor('#721c24');
    } else if (status === 'pending') {
      statusCell.setBackground('#fff3cd').setFontColor('#856404');
    }

    // Color the ReviewSubmitted cell
    if (submitted === true || submitted === 'TRUE') {
      submittedCell.setBackground('#d4edda').setFontColor('#155724');
    }
  }

  SpreadsheetApp.getUi().alert('Formatting applied.');
}
