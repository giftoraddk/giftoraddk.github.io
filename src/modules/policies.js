// Nội dung 4 chính sách gốc: hook/superpowers/policy/cs1.md..cs4.md (thứ tự: thanh toán, vận
// chuyển, đổi trả/hoàn tiền, bảo mật) — đã dịch song ngữ vi/en và bổ sung các điều khoản bảo vệ
// người bán theo thông lệ (đặt cọc hàng tùy chỉnh, bất khả kháng, từ chối nhận hàng, bằng chứng
// đổi trả, quyết định cuối cùng...). Dùng chung cho cả landing (modules/landing/gift.js) và shop
// (modules/shop/gift.js) vì nội dung là chính sách chung của công ty, không riêng theo domain.
// Render bởi src/pages/gift/policy/[slug].astro — mỗi block: { text } = đoạn văn, { items } = list.

export const policies = [
	{
		slug: 'thanh-toan',
		title: { vi: 'Hình thức thanh toán', en: 'Payment Methods' },
		intro: {
			vi: 'Giftora DDK cung cấp nhiều phương thức thanh toán linh hoạt và tiện lợi nhằm đáp ứng nhu cầu của khách hàng. Dưới đây là các hình thức thanh toán mà chúng tôi hỗ trợ:',
			en: "Giftora DDK offers a range of flexible, convenient payment methods to suit every customer's needs. Below are the payment methods we support:",
		},
		sections: [
			{
				heading: { vi: '1. Thanh toán bằng tiền mặt (COD – Cash On Delivery)', en: '1. Cash on Delivery (COD)' },
				blocks: [
					{ label: { vi: 'Áp dụng', en: 'Applies to' }, text: { vi: 'Hình thức thanh toán này cho phép khách hàng thanh toán tiền khi nhận hàng.', en: 'This method lets customers pay in cash at the time of delivery.' } },
					{ label: { vi: 'Quy trình', en: 'Process' }, text: { vi: 'Khi nhân viên giao hàng đến, quý khách có thể kiểm tra sản phẩm trước khi thanh toán.', en: 'When the delivery staff arrives, customers may inspect the product before paying.' } },
					{ label: { vi: 'Lưu ý', en: 'Note' }, text: { vi: 'Nếu chọn thanh toán COD, quý khách sẽ không được hưởng một số ưu đãi dành riêng cho hình thức thanh toán chuyển khoản.', en: 'Customers who choose COD are not eligible for certain promotions reserved for bank-transfer payments.' } },
					{ label: { vi: 'Bảo vệ đơn hàng', en: 'Order protection' }, text: { vi: 'Giftora DDK có quyền từ chối áp dụng COD hoặc yêu cầu đặt cọc trước đối với đơn hàng giá trị lớn, đơn hàng ở khu vực xa, hoặc khách hàng có lịch sử từ chối nhận hàng nhiều lần. Trường hợp khách từ chối nhận hàng COD không vì lý do sản phẩm lỗi, khách hàng có thể phải chịu chi phí vận chuyển hai chiều cho lần giao hàng đó.', en: 'Giftora DDK reserves the right to decline COD or require an advance deposit for high-value orders, orders to remote areas, or customers with a history of repeatedly refusing delivery. If a customer refuses a COD delivery for reasons other than a product defect, the customer may be liable for the round-trip shipping cost of that delivery.' } },
				],
			},
			{
				heading: { vi: '2. Chuyển khoản ngân hàng', en: '2. Bank Transfer' },
				blocks: [
					{ label: { vi: 'Áp dụng', en: 'Applies to' }, text: { vi: 'Hình thức này dành cho khách hàng thanh toán trước cho đơn hàng, bao gồm cả các đơn hàng có in logo, khắc laser hoặc yêu cầu cá nhân hóa cần đặt cọc trước khi sản xuất.', en: 'This method is for customers who pay in advance, including orders with logo printing, laser engraving, or other personalization that requires a deposit before production begins.' } },
					{ label: { vi: 'Thông tin chuyển khoản', en: 'Transfer details' }, text: { vi: 'Vui lòng liên hệ hotline/Zalo 093 456 1501 hoặc email sales@giftoraddk.com để được cung cấp thông tin tài khoản nhận thanh toán chính xác trước khi chuyển khoản. Nội dung chuyển khoản: Tên người chuyển + Mã đơn hàng.', en: "Please contact hotline/Zalo 093 456 1501 or email sales@giftoraddk.com to receive the correct receiving-account details before transferring. Transfer note: Sender's name + Order code." } },
					{ label: { vi: 'Quy trình', en: 'Process' }, text: { vi: 'Khách hàng thực hiện chuyển khoản và thông báo cho chúng tôi qua hotline/Zalo để được xác nhận nhanh chóng.', en: 'Customers complete the transfer and notify us via hotline/Zalo for prompt confirmation.' } },
					{ label: { vi: 'Đặt cọc & sản xuất theo yêu cầu', en: 'Deposits & custom production' }, text: { vi: 'Đối với đơn hàng tùy chỉnh (in logo, khắc tên, đóng gói riêng theo yêu cầu), Giftora DDK có quyền yêu cầu đặt cọc tối thiểu trước khi tiến hành sản xuất. Sau khi sản phẩm đã bắt đầu được cá nhân hóa, tiền cọc sẽ không được hoàn lại nếu khách hàng đơn phương hủy đơn vì lý do không thuộc về Giftora DDK.', en: 'For customized orders (logo printing, name engraving, custom packaging), Giftora DDK reserves the right to require a minimum deposit before production begins. Once personalization of the product has started, the deposit is non-refundable if the customer unilaterally cancels the order for reasons not attributable to Giftora DDK.' } },
					{ label: { vi: 'Xác minh giao dịch', en: 'Payment verification' }, text: { vi: 'Đơn hàng chỉ được xác nhận và xử lý sau khi Giftora DDK nhận và xác minh thanh toán thành công. Giftora DDK không chịu trách nhiệm đối với các giao dịch chuyển nhầm vào tài khoản không phải do chúng tôi cung cấp.', en: 'Orders are confirmed and processed only after Giftora DDK has received and verified successful payment. Giftora DDK is not liable for transfers mistakenly sent to any account other than the one we provide.' } },
				],
			},
			{
				heading: { vi: '3. Hóa đơn thanh toán', en: '3. Invoicing' },
				blocks: [
					{ text: { vi: 'Sau khi hoàn tất thanh toán, Giftora DDK sẽ xuất hóa đơn bán hàng hoặc hóa đơn giá trị gia tăng (VAT) theo yêu cầu của khách hàng.', en: "After payment is completed, Giftora DDK will issue a sales receipt or a VAT invoice at the customer's request." } },
					{ text: { vi: 'Để nhận hóa đơn VAT, vui lòng cung cấp thông tin công ty hoặc cá nhân (tên, địa chỉ, mã số thuế) khi đặt hàng hoặc trước khi xác nhận thanh toán. Thông tin xuất hóa đơn không thể chỉnh sửa sau khi hóa đơn đã được phát hành theo quy định của pháp luật thuế.', en: 'To receive a VAT invoice, please provide company or individual details (name, address, tax code) when placing the order or before payment is confirmed. Invoice details cannot be amended once the invoice has been issued, in accordance with tax regulations.' } },
				],
			},
		],
	},
	{
		slug: 'van-chuyen',
		title: { vi: 'Chính sách vận chuyển', en: 'Shipping Policy' },
		intro: {
			vi: 'Giftora DDK cam kết giao hàng nhanh chóng, an toàn và thuận tiện cho khách hàng trên toàn quốc. Dưới đây là chi tiết về chính sách vận chuyển của chúng tôi:',
			en: 'Giftora DDK is committed to fast, safe, and convenient nationwide delivery. Below are the details of our shipping policy:',
		},
		sections: [
			{
				heading: { vi: '1. Phạm vi giao hàng và chi phí vận chuyển', en: '1. Delivery Coverage & Shipping Fees' },
				blocks: [
					{ text: { vi: 'Giftora DDK hỗ trợ giao hàng trên toàn quốc cho các đơn hàng từ 1 triệu đồng trở lên.', en: 'Giftora DDK ships nationwide for orders valued at 1,000,000 VND or more.' } },
					{ text: { vi: 'Miễn phí vận chuyển toàn quốc với đơn hàng từ 5 triệu đồng trở lên.', en: 'Nationwide shipping is free for orders valued at 5,000,000 VND or more.' } },
					{ label: { vi: 'Lưu ý', en: 'Note' }, text: { vi: 'Các mức phí trên áp dụng cho dịch vụ giao hàng tiêu chuẩn. Với yêu cầu giao nhanh (trong 2 giờ tại TP. HCM hoặc giao gấp trong ngày), chúng tôi sẽ áp dụng mức phí dịch vụ giao nhanh phù hợp với từng đơn hàng cụ thể.', en: 'The fees above apply to standard delivery. For express delivery (within 2 hours in Ho Chi Minh City, or same-day rush delivery), an express service fee will apply and be quoted per order.' } },
				],
			},
			{
				heading: { vi: '2. Thời gian giao hàng', en: '2. Delivery Time' },
				blocks: [
					{ items: [
						{ vi: 'Nội thành TP. HCM: 1–2 ngày làm việc.', en: 'Inner Ho Chi Minh City: 1–2 business days.' },
						{ vi: 'Khu vực ngoại thành và các tỉnh thành khác: 3–5 ngày làm việc.', en: 'Outer districts and other provinces: 3–5 business days.' },
					] },
					{ text: { vi: 'Thời gian giao hàng có thể thay đổi tùy tính chất đơn hàng, yêu cầu in ấn hoặc tình hình tồn kho. Chúng tôi sẽ thông báo thời gian giao hàng cụ thể khi tư vấn và báo giá.', en: 'Delivery times may vary depending on the nature of the order, printing requirements, or stock availability. We will communicate the specific delivery time when advising and quoting each order.' } },
				],
			},
			{
				heading: { vi: '3. Đơn vị vận chuyển', en: '3. Shipping Partners' },
				blocks: [
					{ text: { vi: 'Giftora DDK hợp tác với nhiều đối tác vận chuyển để đảm bảo giao hàng nhanh chóng và an toàn. Hiện tại, chúng tôi sử dụng dịch vụ của các đơn vị uy tín như:', en: 'Giftora DDK partners with multiple carriers to ensure fast, safe delivery. We currently use the services of reputable partners such as:' } },
					{ items: [
						{ vi: 'Bưu điện Việt Nam (VNPost).', en: 'Vietnam Post (VNPost).' },
						{ vi: 'J&T Express.', en: 'J&T Express.' },
						{ vi: 'Viettel Post.', en: 'Viettel Post.' },
						{ vi: 'Liên hệ vận chuyển qua xe tải, xe khách,...', en: 'Freight/coach transport for larger orders, arranged on request.' },
					] },
					{ text: { vi: 'Chúng tôi sẽ lựa chọn đối tác vận chuyển phù hợp với từng đơn hàng để đảm bảo chất lượng dịch vụ và sự hài lòng của khách hàng.', en: 'We select the shipping partner best suited to each order to ensure service quality and customer satisfaction.' } },
				],
			},
			{
				heading: { vi: '4. Quy trình giao hàng', en: '4. Delivery Process' },
				blocks: [
					{ text: { vi: 'Sau khi đơn hàng được xác nhận, Giftora DDK sẽ chuẩn bị và giao hàng cho đối tác vận chuyển trong vòng 1–2 ngày làm việc.', en: 'Once an order is confirmed, Giftora DDK prepares it and hands it to the shipping partner within 1–2 business days.' } },
					{ text: { vi: 'Nhân viên giao hàng sẽ liên hệ trước với quý khách để xác nhận thời gian và địa điểm nhận hàng.', en: 'The delivery staff will contact customers in advance to confirm the delivery time and location.' } },
					{ text: { vi: 'Khách hàng được quyền kiểm tra hàng hóa trước khi nhận. Vui lòng kiểm tra kỹ số lượng, chất lượng sản phẩm và mẫu mã khi nhận hàng.', en: 'Customers are entitled to inspect goods before accepting them. Please check quantity, quality, and design carefully upon receipt.' } },
					{ label: { vi: 'Thông tin người nhận', en: 'Recipient information' }, text: { vi: 'Khách hàng có trách nhiệm cung cấp chính xác họ tên, số điện thoại và địa chỉ nhận hàng. Giftora DDK không chịu trách nhiệm nếu đơn hàng bị thất lạc, giao chậm hoặc giao sai địa chỉ do thông tin khách hàng cung cấp không chính xác hoặc không đầy đủ.', en: 'Customers are responsible for providing an accurate recipient name, phone number, and delivery address. Giftora DDK is not liable for orders that are lost, delayed, or misdelivered due to inaccurate or incomplete information supplied by the customer.' } },
				],
			},
			{
				heading: { vi: '5. Trường hợp giao hàng chậm trễ', en: '5. Delivery Delays' },
				blocks: [
					{ text: { vi: 'Trong trường hợp đơn hàng bị chậm trễ, Giftora DDK sẽ thông báo trước cho khách hàng. Nếu khách hàng không nhận được hàng sau thời gian dự kiến, xin vui lòng liên hệ với chúng tôi để được hỗ trợ kịp thời.', en: 'If an order is delayed, Giftora DDK will notify the customer in advance. If a customer does not receive the order after the expected time, please contact us for prompt assistance.' } },
					{ label: { vi: 'Bất khả kháng', en: 'Force majeure' }, text: { vi: 'Giftora DDK không chịu trách nhiệm về việc chậm trễ giao hàng phát sinh từ các sự kiện bất khả kháng như thiên tai, dịch bệnh, sự cố của đơn vị vận chuyển, đình công hoặc các nguyên nhân khách quan khác nằm ngoài khả năng kiểm soát hợp lý của chúng tôi.', en: 'Giftora DDK is not liable for delivery delays arising from force-majeure events such as natural disasters, epidemics, carrier incidents, strikes, or other objective causes beyond our reasonable control.' } },
				],
			},
			{
				heading: { vi: '6. Trách nhiệm với hàng hóa vận chuyển', en: '6. Liability for Goods in Transit' },
				blocks: [
					{ text: { vi: 'Giftora DDK chịu trách nhiệm về hàng hóa trong suốt quá trình vận chuyển cho đến khi sản phẩm được giao đến khách hàng.', en: 'Giftora DDK is responsible for the goods throughout transit until the product is delivered to the customer.' } },
					{ text: { vi: 'Nếu sản phẩm bị hư hại, bể vỡ trong quá trình vận chuyển, chúng tôi sẽ tiến hành đổi trả hoặc hoàn tiền theo chính sách đã cam kết.', en: 'If a product is damaged or broken during transit, we will process a replacement or refund in line with our stated policy.' } },
					{ label: { vi: 'Từ chối nhận hàng', en: 'Refused delivery' }, text: { vi: 'Trường hợp khách hàng từ chối nhận hàng không vì lý do sản phẩm lỗi hoặc hư hỏng, khách hàng sẽ chịu chi phí vận chuyển hai chiều (giao đi và hoàn về) cho đơn hàng đó.', en: 'If a customer refuses delivery for reasons other than a defective or damaged product, the customer will bear the round-trip shipping cost (outbound and return) for that order.' } },
				],
			},
			{
				heading: { vi: '7. Liên hệ hỗ trợ', en: '7. Support Contact' },
				blocks: [
					{ text: { vi: 'Nếu có bất kỳ câu hỏi nào liên quan đến chính sách vận chuyển, xin vui lòng liên hệ:', en: 'If you have any questions about our shipping policy, please contact:' } },
					{ items: [
						{ vi: 'Hotline/Zalo: 093 456 1501', en: 'Hotline/Zalo: 093 456 1501' },
						{ vi: 'Email: sales@giftoraddk.com', en: 'Email: sales@giftoraddk.com' },
						{ vi: 'Địa chỉ: 670/59/10 Đoàn Văn Bơ, Khu phố 16, Phường Xóm Chiếu, TP. HCM', en: 'Address: 670/59/10 Doan Van Bo, Khu Pho 16, Xom Chieu Ward, Ho Chi Minh City' },
					] },
				],
			},
		],
	},
	{
		slug: 'doi-tra-hoan-tien',
		title: { vi: 'Chính sách đổi trả, hoàn tiền', en: 'Return & Refund Policy' },
		intro: {
			vi: 'Giftora DDK cam kết cung cấp sản phẩm chất lượng và dịch vụ tốt nhất cho khách hàng. Để đảm bảo quyền lợi của bạn, chúng tôi xin đưa ra chính sách kiểm hàng, đổi trả hàng và hoàn tiền như sau:',
			en: "Giftora DDK is committed to providing quality products and the best possible service. To protect your rights, our inspection, return, and refund policy is as follows:",
		},
		sections: [
			{
				heading: { vi: '1. Chính sách kiểm hàng', en: '1. Inspection Policy' },
				blocks: [
					{ text: { vi: 'Tất cả các đơn hàng của Giftora DDK đều được phép kiểm hàng trước khi nhận. Quý khách có thể kiểm tra:', en: 'All Giftora DDK orders may be inspected before acceptance. Customers may check:' } },
					{ items: [
						{ vi: 'Số lượng sản phẩm.', en: 'Product quantity.' },
						{ vi: 'Mẫu mã, chất lượng, in ấn có đúng như thông tin đã được cung cấp qua mẫu in, hình ảnh, hoặc video trước đó.', en: 'Whether the design, quality, and printing match the approved artwork, images, or video shared beforehand.' },
					] },
					{ text: { vi: 'Nếu sản phẩm không đúng mẫu, khách hàng có quyền từ chối nhận hàng hoặc yêu cầu đổi trả/hoàn tiền theo chính sách ở mục 2 bên dưới.', en: 'If the product does not match the approved design, the customer may refuse delivery or request a return/refund under Section 2 below.' } },
				],
			},
			{
				heading: { vi: '2. Chính sách đổi trả hàng', en: '2. Return Policy' },
				blocks: [
					{ text: { vi: 'Quý khách có thể yêu cầu đổi trả hàng trong vòng 5 ngày kể từ ngày nhận hàng với các điều kiện sau:', en: 'Customers may request a return within 5 days of receiving the order, subject to the following conditions:' } },
					{ label: { vi: 'Lý do đổi trả', en: 'Eligible reasons' }, text: { vi: '', en: '' } },
					{ items: [
						{ vi: 'Sản phẩm bị lỗi từ nhà sản xuất.', en: 'The product has a manufacturing defect.' },
						{ vi: 'Sản phẩm bị hư hỏng do quá trình vận chuyển.', en: 'The product was damaged during transit.' },
						{ vi: 'Sản phẩm giao không đúng mẫu mã, kích thước, hoặc màu sắc đã chọn.', en: 'The product delivered does not match the selected design, size, or color.' },
						{ vi: 'Thiếu phụ kiện hoặc các phần kèm theo.', en: 'Accessories or included parts are missing.' },
					] },
					{ label: { vi: 'Điều kiện đổi trả', en: 'Return conditions' }, text: { vi: '', en: '' } },
					{ items: [
						{ vi: 'Sản phẩm còn nguyên vẹn, chưa qua sử dụng.', en: 'The product is intact and unused.' },
						{ vi: 'Tem nhãn và bao bì sản phẩm phải còn nguyên.', en: 'Labels and packaging must be intact.' },
					] },
					{ label: { vi: 'Thời gian xử lý', en: 'Processing time' }, text: { vi: 'Chúng tôi sẽ xử lý yêu cầu đổi trả trong vòng 3–5 ngày làm việc kể từ khi nhận được thông tin và sản phẩm đổi trả.', en: 'We process return requests within 3–5 business days of receiving the request and the returned product.' } },
					{ label: { vi: 'Bằng chứng yêu cầu', en: 'Required evidence' }, text: { vi: 'Mọi yêu cầu đổi trả phải kèm hình ảnh hoặc video rõ ràng thể hiện tình trạng sản phẩm và được gửi trong đúng thời hạn quy định. Sau thời hạn này, đơn hàng được xem là đã được khách hàng nghiệm thu và Giftora DDK có quyền từ chối yêu cầu đổi trả.', en: "All return requests must include clear photos or video evidence of the product's condition, submitted within the specified timeframe. After this period, the order is deemed accepted by the customer, and Giftora DDK reserves the right to decline the return request." } },
					{ label: { vi: 'Sản phẩm tùy chỉnh', en: 'Customized products' }, text: { vi: 'Sản phẩm đã được cá nhân hóa theo yêu cầu riêng của khách hàng (in logo, khắc tên, đóng gói theo mẫu khách cung cấp) không áp dụng đổi trả vì lý do chủ quan, trừ khi sản phẩm bị lỗi từ nhà sản xuất hoặc hư hỏng do vận chuyển.', en: "Products personalized to a customer's specific request (logo printing, name engraving, custom packaging per customer-supplied artwork) are not eligible for return for subjective reasons, unless there is a manufacturing defect or transit damage." } },
					{ label: { vi: 'Trường hợp không hỗ trợ đổi trả', en: 'Cases not eligible for return' }, text: { vi: 'Đối với yêu cầu chủ quan từ khách hàng như thay đổi ý định mua hàng, chúng tôi hiện chưa có chính sách hỗ trợ.', en: 'We currently do not support returns for subjective customer reasons, such as a change of mind.' } },
					{ label: { vi: 'Hàng bể vỡ', en: 'Broken/damaged goods' }, text: { vi: 'Nếu sản phẩm bị bể, vỡ trong quá trình vận chuyển, quý khách vui lòng gửi yêu cầu đổi trả kèm hình ảnh trong vòng 24 giờ kể từ khi nhận hàng.', en: 'If a product is broken or damaged in transit, please submit a return request with photos within 24 hours of receiving the order.' } },
					{ label: { vi: 'Quyết định cuối cùng', en: 'Final decision' }, text: { vi: 'Giftora DDK có quyền xem xét, đánh giá bằng chứng do khách hàng cung cấp và đưa ra quyết định cuối cùng về việc chấp nhận hay từ chối yêu cầu đổi trả/hoàn tiền.', en: 'Giftora DDK reserves the right to review the evidence provided by the customer and make the final decision on whether to accept or decline a return/refund request.' } },
				],
			},
			{
				heading: { vi: '3. Chính sách hoàn tiền', en: '3. Refund Policy' },
				blocks: [
					{ text: { vi: 'Giftora DDK sẽ hoàn tiền cho khách hàng trong các trường hợp sau:', en: 'Giftora DDK will issue a refund to the customer in the following cases:' } },
					{ label: { vi: 'Không còn sản phẩm để thay thế', en: 'No replacement available' }, text: { vi: 'Nếu sản phẩm cần đổi không còn trong kho, chúng tôi sẽ hoàn trả 100% số tiền khách hàng đã thanh toán.', en: 'If the product to be exchanged is out of stock, we will refund 100% of the amount paid by the customer.' } },
					{ label: { vi: 'Không thể giao hàng', en: 'Unable to deliver' }, text: { vi: 'Trong trường hợp chúng tôi không thể giao hàng do hết hàng hoặc lỗi từ hệ thống, Giftora DDK sẽ thông báo và tiến hành hoàn tiền cho khách hàng trong vòng 7 ngày kể từ ngày nhận tiền.', en: 'If we are unable to deliver due to being out of stock or a system error, Giftora DDK will notify the customer and process the refund within 7 days of receiving payment.' } },
					{ label: { vi: 'Hình thức hoàn tiền', en: 'Refund method' }, text: { vi: 'Chúng tôi hoàn tiền qua chuyển khoản ngân hàng hoặc tiền mặt tại văn phòng của Giftora DDK.', en: "We issue refunds via bank transfer or in cash at Giftora DDK's office." } },
					{ label: { vi: 'Lệ phí hoàn trả', en: 'Return shipping cost' }, text: { vi: 'Chúng tôi sẽ chi trả hoàn toàn chi phí vận chuyển nếu lỗi thuộc về Giftora DDK. Nếu lỗi thuộc về khách hàng, khách hàng sẽ chịu chi phí vận chuyển.', en: 'We cover the full shipping cost if the fault is ours. If the fault lies with the customer, the customer bears the shipping cost.' } },
				],
			},
			{
				heading: { vi: '4. Liên hệ hỗ trợ', en: '4. Support Contact' },
				blocks: [
					{ text: { vi: 'Nếu quý khách có bất kỳ thắc mắc nào về chính sách kiểm hàng, đổi trả hàng và hoàn tiền, xin vui lòng liên hệ:', en: 'If you have any questions about our inspection, return, and refund policy, please contact:' } },
					{ items: [
						{ vi: 'Hotline/Zalo: 093 456 1501', en: 'Hotline/Zalo: 093 456 1501' },
						{ vi: 'Email: sales@giftoraddk.com', en: 'Email: sales@giftoraddk.com' },
						{ vi: 'Địa chỉ: 670/59/10 Đoàn Văn Bơ, Khu phố 16, Phường Xóm Chiếu, TP. HCM', en: 'Address: 670/59/10 Doan Van Bo, Khu Pho 16, Xom Chieu Ward, Ho Chi Minh City' },
					] },
				],
			},
		],
	},
	{
		slug: 'bao-mat',
		title: { vi: 'Chính sách bảo mật', en: 'Privacy Policy' },
		intro: {
			vi: 'Công ty TNHH Giftora DDK ("chúng tôi") cam kết bảo vệ sự riêng tư của khách hàng. Chính sách bảo mật này giải thích cách chúng tôi thu thập, sử dụng và bảo vệ thông tin cá nhân của khách hàng khi truy cập và sử dụng trang web https://giftoraddk.com',
			en: 'Giftora DDK Co., Ltd. ("we", "us") is committed to protecting customer privacy. This privacy policy explains how we collect, use, and protect personal information when you access and use https://giftoraddk.com',
		},
		sections: [
			{
				heading: { vi: '1. Thông tin chúng tôi thu thập', en: '1. Information We Collect' },
				blocks: [
					{ text: { vi: 'Chúng tôi có thể thu thập các loại thông tin sau đây từ người dùng:', en: 'We may collect the following types of information from users:' } },
					{ items: [
						{ vi: 'Thông tin cá nhân: bao gồm tên, địa chỉ, email, số điện thoại, và các thông tin khác khi khách hàng đăng ký tài khoản hoặc mua hàng.', en: 'Personal information: name, address, email, phone number, and other details provided when registering an account or placing an order.' },
						{ vi: 'Thông tin về giao dịch: bao gồm chi tiết về đơn hàng, thanh toán và lịch sử mua hàng của khách hàng.', en: "Transaction information: order details, payment, and the customer's purchase history." },
						{ vi: 'Thông tin về thiết bị: bao gồm địa chỉ IP, loại trình duyệt, hệ điều hành và thông tin về trang web mà khách hàng truy cập trước khi đến với chúng tôi.', en: 'Device information: IP address, browser type, operating system, and the referring website.' },
					] },
				],
			},
			{
				heading: { vi: '2. Cách chúng tôi sử dụng thông tin', en: '2. How We Use Information' },
				blocks: [
					{ text: { vi: 'Thông tin mà chúng tôi thu thập có thể được sử dụng cho các mục đích sau:', en: 'The information we collect may be used for the following purposes:' } },
					{ items: [
						{ vi: 'Xử lý đơn hàng: Thông tin cá nhân sẽ được sử dụng để xác nhận và hoàn tất các đơn hàng của khách hàng.', en: "Order processing: personal information is used to confirm and complete customers' orders." },
						{ vi: 'Cải thiện dịch vụ khách hàng: Chúng tôi sử dụng phản hồi từ khách hàng để cải thiện chất lượng sản phẩm và dịch vụ.', en: 'Improving customer service: we use customer feedback to improve product and service quality.' },
						{ vi: 'Marketing: Nếu khách hàng đồng ý, chúng tôi có thể gửi thông tin về các chương trình khuyến mãi, sản phẩm mới, hoặc tin tức khác qua email hoặc tin nhắn.', en: 'Marketing: with the customer\'s consent, we may send promotions, new-product updates, or other news via email or message.' },
						{ vi: 'Phân tích dữ liệu: Chúng tôi có thể sử dụng thông tin để phân tích xu hướng và cải thiện hiệu suất của trang web.', en: 'Data analysis: we may use information to analyze trends and improve website performance.' },
					] },
				],
			},
			{
				heading: { vi: '3. Chia sẻ thông tin', en: '3. Sharing Information' },
				blocks: [
					{ text: { vi: 'Chúng tôi không chia sẻ thông tin cá nhân của khách hàng với bên thứ ba, ngoại trừ các trường hợp sau:', en: "We do not share customers' personal information with third parties, except in the following cases:" } },
					{ items: [
						{ vi: 'Nhà cung cấp dịch vụ: Chúng tôi có thể chia sẻ thông tin của bạn với các đối tác hoặc nhà cung cấp dịch vụ để thực hiện các chức năng hỗ trợ như xử lý thanh toán hoặc giao hàng.', en: 'Service providers: we may share your information with partners or service providers to perform supporting functions such as payment processing or delivery.' },
						{ vi: 'Yêu cầu pháp lý: Chúng tôi có thể chia sẻ thông tin nếu được yêu cầu bởi cơ quan pháp luật hoặc để bảo vệ quyền lợi hợp pháp của chúng tôi.', en: 'Legal requirements: we may share information when required by law or to protect our legitimate rights.' },
					] },
				],
			},
			{
				heading: { vi: '4. Bảo mật thông tin', en: '4. Information Security' },
				blocks: [
					{ text: { vi: 'Chúng tôi cam kết áp dụng các biện pháp bảo mật thích hợp để bảo vệ thông tin cá nhân của bạn khỏi truy cập, thay đổi, tiết lộ hoặc hủy hoại trái phép. Tuy nhiên, chúng tôi không thể đảm bảo hoàn toàn bảo mật của dữ liệu khi truyền qua Internet.', en: 'We are committed to applying appropriate security measures to protect your personal information from unauthorized access, alteration, disclosure, or destruction. However, we cannot guarantee absolute security of data transmitted over the Internet.' } },
					{ label: { vi: 'Giới hạn trách nhiệm', en: 'Limitation of liability' }, text: { vi: 'Chúng tôi sẽ nỗ lực hết sức để bảo vệ dữ liệu khách hàng nhưng không chịu trách nhiệm đối với thiệt hại phát sinh từ các sự cố bảo mật nằm ngoài khả năng kiểm soát hợp lý của chúng tôi (tấn công mạng tinh vi, sự cố hệ thống của bên thứ ba cung cấp dịch vụ...).', en: "We make every reasonable effort to protect customer data but are not liable for damages arising from security incidents beyond our reasonable control (sophisticated cyberattacks, third-party service provider system failures, etc.)." } },
				],
			},
			{
				heading: { vi: '5. Quyền lợi của khách hàng', en: '5. Customer Rights' },
				blocks: [
					{ text: { vi: 'Khách hàng có quyền:', en: 'Customers have the right to:' } },
					{ items: [
						{ vi: 'Truy cập và chỉnh sửa thông tin cá nhân của mình tại bất kỳ thời điểm nào.', en: 'Access and edit their personal information at any time.' },
						{ vi: 'Yêu cầu xóa thông tin cá nhân khỏi hệ thống của chúng tôi nếu không còn cần thiết cho mục đích sử dụng.', en: 'Request deletion of personal information from our system when it is no longer needed for its original purpose.' },
						{ vi: 'Từ chối nhận email tiếp thị bằng cách hủy đăng ký thông qua liên kết có trong các email mà chúng tôi gửi.', en: 'Opt out of marketing emails by unsubscribing via the link included in our emails.' },
					] },
				],
			},
			{
				heading: { vi: '6. Cookies', en: '6. Cookies' },
				blocks: [
					{ text: { vi: 'Chúng tôi sử dụng cookies để nâng cao trải nghiệm người dùng trên trang web. Bạn có thể quản lý và xóa cookies thông qua cài đặt trình duyệt của cá nhân. Tuy nhiên, việc từ chối cookies có thể làm ảnh hưởng đến việc sử dụng một số tính năng trên trang web.', en: 'We use cookies to enhance your experience on our website. You can manage and delete cookies through your browser settings. However, declining cookies may affect your ability to use some website features.' } },
				],
			},
			{
				heading: { vi: '7. Liên kết đến trang web khác', en: '7. Links to Other Websites' },
				blocks: [
					{ text: { vi: 'Trang web của chúng tôi có thể chứa liên kết đến các trang web bên thứ ba. Chúng tôi không chịu trách nhiệm về nội dung hay chính sách bảo mật của các trang web này. Vui lòng đọc kỹ chính sách bảo mật của họ trước khi cung cấp bất kỳ thông tin nào.', en: 'Our website may contain links to third-party websites. We are not responsible for the content or privacy policies of those websites. Please review their privacy policies carefully before providing any information.' } },
				],
			},
			{
				heading: { vi: '8. Thay đổi chính sách bảo mật', en: '8. Changes to This Privacy Policy' },
				blocks: [
					{ text: { vi: 'Chúng tôi có quyền thay đổi nội dung của chính sách bảo mật này vào bất kỳ thời điểm nào. Bất kỳ thay đổi nào sẽ được cập nhật trên trang web của chúng tôi và có hiệu lực ngay lập tức.', en: 'We reserve the right to change this privacy policy at any time. Any changes will be updated on our website and take effect immediately.' } },
				],
			},
			{
				heading: { vi: '9. Liên hệ', en: '9. Contact' },
				blocks: [
					{ text: { vi: 'Nếu bạn có bất kỳ câu hỏi nào về chính sách bảo mật này, vui lòng liên hệ với chúng tôi qua:', en: 'If you have any questions about this privacy policy, please contact us via:' } },
					{ items: [
						{ vi: 'Công ty TNHH Giftora DDK', en: 'Giftora DDK Co., Ltd.' },
						{ vi: 'Địa chỉ: 670/59/10 Đoàn Văn Bơ, Khu phố 16, Phường Xóm Chiếu, TP. HCM', en: 'Address: 670/59/10 Doan Van Bo, Khu Pho 16, Xom Chieu Ward, Ho Chi Minh City' },
						{ vi: 'Hotline/Zalo: 093 456 1501', en: 'Hotline/Zalo: 093 456 1501' },
						{ vi: 'Email: sales@giftoraddk.com', en: 'Email: sales@giftoraddk.com' },
					] },
				],
			},
		],
	},
];
