 
# utils/notifications.py
import requests
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

class NotificationHandler:
    """Free WhatsApp + SMS Notification Handler"""
    
    def __init__(self):
        self.whatsapp_token = getattr(settings, 'META_WHATSAPP_TOKEN', None)
        self.whatsapp_phone_id = getattr(settings, 'META_PHONE_NUMBER_ID', None)
        self.fast2sms_key = getattr(settings, 'FAST2SMS_API_KEY', None)
        self.sender_id = getattr(settings, 'FAST2SMS_SENDER_ID', 'FTHCRG')
    
    def send_whatsapp_meta(self, to_number, message):
        """Send WhatsApp using Meta Cloud API"""
        if not self.whatsapp_token or not self.whatsapp_phone_id:
            logger.warning("WhatsApp API not configured")
            return False
        
        clean_number = to_number.replace('+', '').replace(' ', '').strip()
        if len(clean_number) == 10:
            clean_number = f"91{clean_number}"
        
        url = f"https://graph.facebook.com/v18.0/{self.whatsapp_phone_id}/messages"
        headers = {
            "Authorization": f"Bearer {self.whatsapp_token}",
            "Content-Type": "application/json"
        }
        data = {
            "messaging_product": "whatsapp",
            "to": clean_number,
            "type": "text",
            "text": {"body": message[:1000]}
        }
        
        try:
            response = requests.post(url, headers=headers, json=data, timeout=10)
            if response.status_code == 200:
                logger.info(f"WhatsApp sent to {to_number}")
                return True
            else:
                logger.error(f"WhatsApp failed: {response.text}")
                return False
        except Exception as e:
            logger.error(f"WhatsApp error: {str(e)}")
            return False
    
    def send_sms_fast2sms(self, to_number, message):
        """Send SMS using Fast2SMS"""
        if not self.fast2sms_key:
            logger.warning("Fast2SMS API not configured")
            return False
        
        clean_number = to_number.replace('+', '').replace(' ', '').strip()
        if len(clean_number) == 10:
            clean_number = f"91{clean_number}"
        
        url = "https://www.fast2sms.com/dev/bulkV2"
        payload = {
            "authorization": self.fast2sms_key,
            "route": "dlt",
            "sender_id": self.sender_id,
            "message": message[:300],
            "numbers": clean_number
        }
        
        try:
            response = requests.post(url, data=payload, timeout=10)
            result = response.json()
            if result.get('return'):
                logger.info(f"SMS sent to {to_number}")
                return True
            else:
                logger.error(f"SMS failed: {result}")
                return False
        except Exception as e:
            logger.error(f"SMS error: {str(e)}")
            return False
    
    def send_order_notification(self, order_data):
        """Send order notification to sender and receiver"""
        
        sender_phone = order_data.get('pickup_contact')
        receiver_phone = order_data.get('delivery_contact')
        
        tracking_link = f"https://faith-cargo.vercel.app/tracking?lr={order_data.get('lr_number')}"
        
        sender_msg = f"""📦 Faith Cargo - Order Confirmed!

✅ LR: {order_data.get('lr_number')}
📍 From: {order_data.get('pickup_pincode')} → To: {order_data.get('delivery_pincode')}
⚖️ Weight: {order_data.get('weight')} kg
💰 Total: ₹{order_data.get('total_value', 0):,.2f}

🔗 Track: {tracking_link}
📞 Support: 9818641504

Thank you for choosing Faith Cargo!"""
        
        receiver_msg = f"""📦 Faith Cargo - Shipment Incoming!

🚚 A shipment is on its way to you!

📋 LR: {order_data.get('lr_number')}
📍 From: {order_data.get('pickup_pincode')}
⚖️ Weight: {order_data.get('weight')} kg

🔗 Track: {tracking_link}

Faith Cargo - Delivering Trust"""
        
        results = []
        
        if sender_phone and len(sender_phone) == 10:
            if not self.send_whatsapp_meta(sender_phone, sender_msg):
                self.send_sms_fast2sms(sender_phone, sender_msg[:150])
            results.append("sender_notified")
        
        if receiver_phone and len(receiver_phone) == 10:
            if not self.send_whatsapp_meta(receiver_phone, receiver_msg):
                self.send_sms_fast2sms(receiver_phone, receiver_msg[:150])
            results.append("receiver_notified")
        
        return results


def send_order_notification(order_data):
    handler = NotificationHandler()
    return handler.send_order_notification(order_data)